import { UltraHonkBackend } from "@aztec/bb.js";
import { SDK } from "@zkfair/sdk";
import { hashRecordLeaf } from "@zkfair/sdk/hash";
import { verifyMerkleProof } from "@zkfair/sdk/merkle";
import {
	fairness_audit_circuit,
	training_circuit,
} from "@zkfair/zk-circuits/codegen";
import { Hono } from "hono";
import { encodePacked, type Hex, keccak256, recoverMessageAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const pk = process.env.ATTESTATION_SERVICE_PRIVATE_KEY as `0x${string}`;
if (!pk) {
	throw new Error("Missing ATTESTATION_SERVICE_PRIVATE_KEY");
}
const account = privateKeyToAccount(pk);

const sdk = new SDK();

const app = new Hono();

const trainingBackend = new UltraHonkBackend(training_circuit.bytecode, {
	threads: 1,
});
const auditBackend = new UltraHonkBackend(fairness_audit_circuit.bytecode, {
	threads: 1,
});

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

		const signature = await account.signMessage({
			message: { raw: messageHash },
		});

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

		// Verification will fail for dummy proofs (0x00) from failed circuits
		const passed = await auditBackend.verifyProof({
			proof: proofBytes,
			publicInputs,
		});

		console.log(
			`Audit ${auditId}: Proof verification ${passed ? "PASSED" : "FAILED"}`,
		);

		// 2. Create attestation hash from proof
		const attestationHash = keccak256(proof);

		// 3. Sign message matching contract format:
		// keccak256(abi.encodePacked(uint256(auditId), attestationHash, passed, "AUDIT"))
		const messageHash = keccak256(
			encodePacked(
				["uint256", "bytes32", "bool", "string"],
				[BigInt(auditId), attestationHash, passed, "AUDIT"],
			),
		);

		const signature = await account.signMessage({
			message: { raw: messageHash },
		});

		// 4. Return attestation (provider will submit via contract)
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

app.post("/attest/dispute", async (c) => {
	try {
		const { batchId, receipt, featuresHash, providerSignature, merkleProof } =
			await c.req.json<{
				batchId: string | number;
				receipt: {
					seqNum: number;
					modelId: number;
					features: number[];
					sensitiveAttr: number;
					prediction: number;
					timestamp: number;
				};
				featuresHash: Hex;
				providerSignature: Hex;
				merkleProof: { sibling: string; position: "left" | "right" }[];
			}>();

		if (!batchId || !receipt || !merkleProof) {
			return c.json({ error: "Missing batchId, receipt, or merkleProof" }, 400);
		}

		// 1. Read batch from chain
		const batch = await sdk.batch.get(BigInt(batchId));

		// 2. Read model to get provider address
		const model = await sdk.model.getById(batch.modelId);

		// 3. Verify provider signature on receipt data
		const dataHash = keccak256(
			encodePacked(
				["uint256", "uint256", "bytes32", "uint256", "int256", "uint256"],
				[
					BigInt(receipt.seqNum),
					BigInt(receipt.modelId),
					featuresHash,
					BigInt(receipt.sensitiveAttr),
					BigInt(receipt.prediction),
					BigInt(receipt.timestamp),
				],
			),
		);

		const recoveredAddress = await recoverMessageAddress({
			message: { raw: dataHash },
			signature: providerSignature,
		});

		if (recoveredAddress.toLowerCase() !== model.provider.toLowerCase()) {
			return c.json({ error: "Invalid provider signature" }, 400);
		}

		// 4. Compute Poseidon leaf from receipt data
		const leafHash = hashRecordLeaf({
			seqNum: receipt.seqNum,
			modelId: receipt.modelId,
			features: receipt.features,
			sensitiveAttr: receipt.sensitiveAttr,
			prediction: receipt.prediction,
			timestamp: receipt.timestamp,
		});

		// 5. Verify Poseidon Merkle proof against on-chain root
		const isValid = await verifyMerkleProof(
			leafHash,
			batch.merkleRoot,
			merkleProof,
		);

		if (isValid) {
			return c.json(
				{ error: "Merkle proof is valid - no fraud detected" },
				400,
			);
		}

		// 6. Proof failed — fraud confirmed. Sign attestation.
		const batchMerkleRoot = batch.merkleRoot;
		const attestationHash = keccak256(
			encodePacked(
				["uint256", "uint256", "bytes32"],
				[BigInt(batchId), BigInt(receipt.seqNum), batchMerkleRoot],
			),
		);

		const messageHash = keccak256(
			encodePacked(
				["uint256", "uint256", "bytes32", "string"],
				[BigInt(batchId), BigInt(receipt.seqNum), attestationHash, "DISPUTE"],
			),
		);

		const signature = await account.signMessage({
			message: { raw: messageHash },
		});

		console.log(
			`Dispute attestation for batch ${batchId}, seqNum ${receipt.seqNum}: FRAUD CONFIRMED`,
		);

		return c.json({ attestationHash, signature });
	} catch (error) {
		console.error("Dispute attestation error:", error);
		return c.json({ error: "Attestation failed", details: String(error) }, 500);
	}
});

app.get("/health", (c) =>
	c.json({
		status: "ok",
		attestor: account.address,
	}),
);

export default app;
