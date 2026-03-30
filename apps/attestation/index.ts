import { UltraHonkBackend } from "@aztec/bb.js";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { SDK } from "@zkfair/sdk";
import { hashRecordLeaf } from "@zkfair/sdk/hash";
import { verifyMerkleProof } from "@zkfair/sdk/merkle";
import {
	fairness_audit_circuit,
	training_circuit,
} from "@zkfair/zk-circuits/codegen";
import { encodePacked, type Hex, keccak256, recoverMessageAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
	AuditRequestSchema,
	AuditResponseSchema,
	DisputeRequestSchema,
	DisputeResponseSchema,
	ErrorResponseSchema,
	HealthResponseSchema,
	TrainingRequestSchema,
	TrainingResponseSchema,
} from "./schemas";

const pk = process.env.ATTESTATION_SERVICE_PRIVATE_KEY as `0x${string}`;
if (!pk) {
	throw new Error("Missing ATTESTATION_SERVICE_PRIVATE_KEY");
}
const account = privateKeyToAccount(pk);

const sdk = new SDK();

const app = new OpenAPIHono();

const trainingBackend = new UltraHonkBackend(training_circuit.bytecode, {
	threads: 1,
});
const auditBackend = new UltraHonkBackend(fairness_audit_circuit.bytecode, {
	threads: 1,
});

// Routes

const trainingRoute = createRoute({
	method: "post",
	path: "/attest/training",
	tags: ["Attestation"],
	summary: "Attest training proof",
	description:
		"Verify a UltraHonk training circuit proof and return a signed attestation certifying the model was trained fairly.",
	request: {
		body: {
			content: { "application/json": { schema: TrainingRequestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: {
				"application/json": { schema: TrainingResponseSchema },
			},
			description: "Proof verified, training attestation issued",
		},
		400: {
			content: { "application/json": { schema: ErrorResponseSchema } },
			description: "Proof verification failed or invalid input",
		},
		500: {
			content: { "application/json": { schema: ErrorResponseSchema } },
			description: "Attestation failed",
		},
	},
});

// @ts-expect-error - OpenAPIHono strict return type checking can't verify discriminated union across multiple c.json() return paths
app.openapi(trainingRoute, async (c) => {
	try {
		const { proof, publicInputs, weightsHash } = c.req.valid("json");

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
		const attestationHash = keccak256(proof as Hex);

		// 3. Sign message
		const messageHash = keccak256(
			encodePacked(
				["bytes32", "bytes32", "string"],
				[weightsHash as Hex, attestationHash, "TRAINING_CERT"],
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

const auditRoute = createRoute({
	method: "post",
	path: "/attest/audit",
	tags: ["Attestation"],
	summary: "Attest audit proof",
	description:
		"Verify a UltraHonk fairness audit circuit proof and return a signed attestation. The attestation includes whether the proof passed or failed.",
	request: {
		body: {
			content: { "application/json": { schema: AuditRequestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: AuditResponseSchema } },
			description: "Audit attestation issued (pass or fail)",
		},
		400: {
			content: { "application/json": { schema: ErrorResponseSchema } },
			description: "Invalid input",
		},
		500: {
			content: { "application/json": { schema: ErrorResponseSchema } },
			description: "Attestation failed",
		},
	},
});

// @ts-expect-error - OpenAPIHono strict return type checking can't verify discriminated union across multiple c.json() return paths
app.openapi(auditRoute, async (c) => {
	try {
		const { proof, publicInputs, auditId } = c.req.valid("json");

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
		const attestationHash = keccak256(proof as Hex);

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

const disputeRoute = createRoute({
	method: "post",
	path: "/attest/dispute",
	tags: ["Attestation"],
	summary: "Attest dispute (fraud verification)",
	description:
		"Verify whether a provider committed fraud by checking a signed receipt against the on-chain batch Merkle root. Returns a signed attestation only if fraud is confirmed.",
	request: {
		body: {
			content: { "application/json": { schema: DisputeRequestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: {
				"application/json": { schema: DisputeResponseSchema },
			},
			description: "Fraud confirmed, dispute attestation issued",
		},
		400: {
			content: { "application/json": { schema: ErrorResponseSchema } },
			description: "No fraud detected or invalid input",
		},
		500: {
			content: { "application/json": { schema: ErrorResponseSchema } },
			description: "Attestation failed",
		},
	},
});

// @ts-expect-error - OpenAPIHono strict return type checking can't verify discriminated union across multiple c.json() return paths
app.openapi(disputeRoute, async (c) => {
	try {
		const { batchId, receipt, featuresHash, providerSignature, merkleProof } =
			c.req.valid("json");

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
					featuresHash as Hex,
					BigInt(receipt.sensitiveAttr),
					BigInt(receipt.prediction),
					BigInt(receipt.timestamp),
				],
			),
		);

		const recoveredAddress = await recoverMessageAddress({
			message: { raw: dataHash },
			signature: providerSignature as Hex,
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

const healthRoute = createRoute({
	method: "get",
	path: "/health",
	tags: ["Health"],
	summary: "Health check",
	description:
		"Returns service status and the Ethereum address of the attestation signer.",
	responses: {
		200: {
			content: { "application/json": { schema: HealthResponseSchema } },
			description: "Service is healthy",
		},
	},
});

app.openapi(healthRoute, (c) =>
	c.json({
		status: "ok",
		attestor: account.address,
	}),
);

// OpenAPI spec + Scalar UI

app.doc("/openapi.json", {
	openapi: "3.1.0",
	info: {
		title: "zkFair Attestation Service",
		version: "1.0.0",
		description:
			"Off-chain proof verification and attestation service for the zkFair protocol. Verifies UltraHonk ZK proofs and returns signed attestations for training, audit, and dispute flows.",
	},
	tags: [
		{ name: "Health", description: "Service health" },
		{
			name: "Attestation",
			description: "Proof verification and attestation signing",
		},
	],
});

app.get(
	"/reference",
	apiReference({
		url: "/openapi.json",
		theme: "kepler",
	}),
);

export default app;
