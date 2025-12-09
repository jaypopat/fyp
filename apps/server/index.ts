import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import * as ort from "onnxruntime-node";
import { encodePacked, type Hex, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
	getBatchBySequence,
	getQueriesBySequence,
	getQueryBySeqNum,
	initDatabase,
	insertQuery,
} from "./db";
import { handleAuditRequest } from "./lib/audit";
import { createBatchIfNeeded } from "./lib/batch.service";
import { loadAllModels } from "./lib/models";
import { sdk } from "./lib/sdk";

const providerKey = process.env.PRIVATE_KEY as Hex;
if (!providerKey) {
	throw new Error("PRIVATE_KEY is required");
}
const providerAccount = privateKeyToAccount(providerKey);

/**
 * Create a signed receipt for an inference query
 * The dataHash binds all query data cryptographically
 * The signature proves the provider committed to this data
 */
function createReceipt(data: {
	seqNum: number;
	modelId: number;
	features: number[];
	sensitiveAttr: number;
	prediction: number;
	timestamp: number;
}) {
	const featuresHash = keccak256(
		encodePacked(["string"], [JSON.stringify(data.features)]),
	);

	// Creating a deterministic hash of all query data (same as in contract)
	const dataHash = keccak256(
		encodePacked(
			["uint256", "uint256", "bytes32", "uint256", "int256", "uint256"],
			[
				BigInt(data.seqNum),
				BigInt(data.modelId),
				featuresHash,
				BigInt(data.sensitiveAttr),
				BigInt(Math.round(data.prediction * 1e6)), // Scale prediction to int
				BigInt(data.timestamp),
			],
		),
	);

	return { dataHash, featuresHash };
}

async function signReceipt(dataHash: Hex): Promise<Hex> {
	return await providerAccount.signMessage({
		message: { raw: dataHash },
	});
}

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

const registry = await loadAllModels();

initDatabase();

sdk.events.watchAuditRequested(handleAuditRequest);

// Periodic batch check - ensures time-based batching works even without new queries
// Runs every 5 minutes to check if any queries need batching due to age
const BATCH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
setInterval(async () => {
	try {
		const batch = await createBatchIfNeeded();
		if (batch) {
			console.log(`Periodic batch check created batch: ${batch.id}`);
		}
	} catch (error) {
		console.error("Periodic batch check failed:", error);
	}
}, BATCH_CHECK_INTERVAL_MS);

console.log(
	`Periodic batch check enabled (every ${BATCH_CHECK_INTERVAL_MS / 1000}s)`,
);

// ============================================
// ENDPOINTS
// ============================================

app.get("/health", (c) => {
	return c.json({
		status: "ok",
		loadedModels: Array.from(registry.sessions.keys()),
		timestamp: Date.now(),
	});
});

app.get("/models", (c) => {
	return c.json({
		models: Array.from(registry.sessions.keys()).map((id) => ({
			modelId: id,
		})),
	});
});

/**
 * Inference endpoint
 */
app.post("/predict", async (c) => {
	try {
		const body = await c.req.json();
		const { modelHash, input } = body as {
			modelHash: string; // Contract weightsHash
			input: unknown;
		};

		// Validate input
		if (modelHash === undefined || input === undefined) {
			return c.json({ error: "modelHash and input are required" }, 400);
		}

		// For demo models, we expect a numeric array
		if (!Array.isArray(input)) {
			return c.json({ error: "input must be an array" }, 400);
		}

		// Look up numeric modelId from hash
		const modelId = registry.hashToId.get(modelHash.toLowerCase());
		if (modelId === undefined) {
			return c.json(
				{ error: `Model hash ${modelHash} not found in registry` },
				404,
			);
		}

		// Get model session by numeric ID
		const session = registry.sessions.get(modelId);
		if (!session) {
			return c.json({ error: `Model ${modelId} not loaded` }, 404);
		}

		// Prepare input tensor
		const inputTensor = new ort.Tensor(
			"float32",
			Float32Array.from(input as number[]),
			[1, (input as number[]).length],
		);

		const results = await session.run({
			float_input: inputTensor,
		});

		const outputTensor = results.label || results.output0;
		const prediction = outputTensor?.data[0] as number;

		const now = Date.now();
		const asF32 = Array.from(new Float32Array(input as number[]));

		console.log(`Inference for model ${modelId}: ${prediction}`);

		const seqNum = await insertQuery({
			modelId: modelId,
			features: asF32,
			sensitiveAttr: Number(input[9] || 0), // sex attribute
			prediction: Number(prediction),
			timestamp: now,
		});
		console.log(`Stored query as sequence #${seqNum}`);

		await createBatchIfNeeded();

		const sensitiveAttr = Number(input[9] || 0);

		// Create signed receipt for user
		const receiptData = {
			seqNum,
			modelId,
			features: asF32,
			sensitiveAttr,
			prediction: Number(prediction),
			timestamp: now,
		};
		const { dataHash, featuresHash } = createReceipt(receiptData);
		const providerSignature = await signReceipt(dataHash);

		return c.json({
			// Inference result
			modelId,
			prediction: Number(prediction),
			timestamp: now,

			// Receipt for user to store
			receipt: {
				seqNum,
				modelId,
				features: asF32,
				sensitiveAttr,
				prediction: Number(prediction),
				timestamp: now,
				dataHash,
				featuresHash, // For on-chain dispute (user can verify locally with full features)
				providerSignature,
			},
		});
	} catch (error) {
		console.error("Inference error:", error);
		return c.json(
			{
				error: (error as Error).message || "Inference failed",
			},
			500,
		);
	}
});

/**
 * Get Merkle proof for a query by sequence number
 * Returns ONLY the proof - client should fetch batch data from blockchain
 */
app.get("/proof/:seqNum", async (c) => {
	const seqNumStr = c.req.param("seqNum");
	const seqNum = Number(seqNumStr);

	if (Number.isNaN(seqNum)) {
		return c.json({ error: "seqNum must be a number" }, 400);
	}

	try {
		// 1. Find the query by sequence number
		const query = await getQueryBySeqNum(seqNum);
		if (!query) {
			return c.json({ error: "Query not found" }, 404);
		}

		// 2. Check if query is batched
		if (!query.batchId) {
			return c.json(
				{
					error: "Query not yet batched",
					status: "PENDING",
					seqNum: query.seq,
				},
				400,
			);
		}

		// 3. Find the batch containing this query
		const batch = await getBatchBySequence(query.seq);
		if (!batch) {
			return c.json({ error: "Batch not found" }, 404);
		}

		// 4. Get all records in the batch to build Merkle tree
		const batchRecords = await getQueriesBySequence(
			batch.startSeq,
			batch.endSeq,
		);

		// Convert to AuditRecord format for SDK
		const records = batchRecords.map((r) => ({
			seqNum: r.seq,
			modelId: r.modelId,
			features: r.features,
			sensitiveAttr: r.sensitiveAttr,
			prediction: r.prediction,
			timestamp: r.timestamp,
		}));

		// 5. Generate Merkle proof using SDK
		const proof = await sdk.audit.createProof(records, seqNum);

		// Return ONLY the proof - client finds batch from blockchain by timestamp
		return c.json({
			proof: {
				index: proof.index,
				siblings: proof.proof,
			},
		});
	} catch (error) {
		console.error("Proof generation error:", error);
		return c.json({ error: (error as Error).message }, 500);
	}
});

const port = Number(process.env.PORT) || 5000;

console.log("Starting ZKFair inference server...");

export default {
	port,
	fetch: app.fetch,
};

console.log(`Server running on http://localhost:${port}`);
