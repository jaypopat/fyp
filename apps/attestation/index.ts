import { UltraHonkBackend } from "@aztec/bb.js";
import {
	fairness_audit_circuit,
	training_circuit,
} from "@zkfair/zk-circuits/codegen";
import { Hono } from "hono";
import { encodePacked, type Hex, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const pk = process.env.ATTESTATION_SERVICE_PRIVATE_KEY as `0x${string}`;
const account = privateKeyToAccount(pk);

if (!pk) {
	throw new Error("Missing ATTESTATION_SERVICE_PRIVATE_KEY");
}

const app = new Hono();

const trainingBackend = new UltraHonkBackend(training_circuit.bytecode);
const auditBackend = new UltraHonkBackend(fairness_audit_circuit.bytecode);

app.post("/attest/training", async (c) => {
	try {
		const { proof, publicInputs, weightsHash } = await c.req.json<{
			proof: `0x${string}`;
			publicInputs: `0x${string}`[];
			weightsHash: `0x${string}`;
		}>();

		if (!proof || !publicInputs || !weightsHash) {
			return c.json(
				{ error: "Missing proof, publicInputs, or weightsHash" },
				400,
			);
		}

		if (!proof.startsWith("0x")) {
			return c.json({ error: "Invalid proof format: must start with 0x" }, 400);
		}

		const proofBytes = Buffer.from(proof.slice(2), "hex");

		// 1. Verify proof
		const isValid = await trainingBackend.verifyProof({
			proof: proofBytes,
			publicInputs,
		});

		if (!isValid) {
			return c.json({ error: "Proof verification failed", passed: false }, 400);
		}

		// 2. Create attestation hash from the proof hex
		const attestationHash = keccak256(proof);

		// 3. Sign message
		const messageHash = keccak256(
			encodePacked(
				["bytes32", "bytes32", "string"],
				[weightsHash, attestationHash, "TRAINING_CERT"],
			),
		);

		const signature = (await account.signMessage({
			message: { raw: messageHash },
		})) as Hex;

		return c.json({
			attestationHash,
			signature,
			passed: true,
		});
	} catch (error) {
		console.error("Training attestation error:", error);
		return c.json({ error: "Attestation failed", details: String(error) }, 500);
	}
});

app.post("/attest/audit", async (c) => {
	try {
		const { proof, publicInputs, auditId } = await c.req.json<{
			proof: `0x${string}`;
			publicInputs: `0x${string}`[];
			auditId: string | number | bigint;
		}>();

		if (!proof || !publicInputs || auditId === undefined) {
			return c.json({ error: "Missing proof, publicInputs, or auditId" }, 400);
		}

		if (!proof.startsWith("0x")) {
			return c.json({ error: "Invalid proof format: must start with 0x" }, 400);
		}

		const proofBytes = Buffer.from(proof.slice(2), "hex");

		// 1. Verify proof using UltraHonk backend
		const isValid = await auditBackend.verifyProof({
			proof: proofBytes,
			publicInputs,
		});

		const passed = isValid;

		// 2. Create timestamp
		const timestamp = Math.floor(Date.now() / 1000);

		// 3. Sign message matching contract:
		// keccak256(abi.encodePacked(auditId, passed, timestamp))
		const messageHash = keccak256(
			encodePacked(
				["uint256", "bool", "uint64"],
				[BigInt(auditId), passed, BigInt(timestamp)],
			),
		);

		const signature = (await account.signMessage({
			message: { raw: messageHash },
		})) as Hex;

		// 4. Create attestation hash from proof
		const attestationHash = keccak256(proof);

		// 5. Return attestation (provider will submit via contract)
		return c.json({
			auditId,
			attestationHash,
			passed,
			signature,
		});
	} catch (error) {
		console.error("Audit attestation error:", error);
		return c.json({ error: "Attestation failed", details: String(error) }, 500);
	}
});

// ============================================
// GET /health
// ============================================
app.get("/health", (c) =>
	c.json({
		status: "ok",
		attestor: account.address,
	}),
);

export default app;
