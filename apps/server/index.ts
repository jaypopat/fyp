import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import * as ort from "onnxruntime-node";
import type { Hex } from "viem";
import { initDatabase } from "./db";
import { loadAllModels } from "./lib/models";
import { provider } from "./lib/sdk";

const providerKey = process.env.PRIVATE_KEY as Hex;
if (!providerKey) {
	throw new Error("PRIVATE_KEY is required");
}

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

const registry = await loadAllModels();

initDatabase();

provider.watchAuditRequests((result) => {
	console.log(`Audit ${result.auditId}: ${result.passed ? "PASSED" : "FAILED"} (${result.txHash})`);
});

// Start periodic batch check - ensures time-based batching works even without new queries
provider.startPeriodicBatchCheck(5 * 60 * 1000); // 5 minutes

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

		const sensitiveAttr = Number(input[9] || 0); // sex attribute

		// Store query using provider SDK
		const seqNum = await provider.insertQuery({
			modelId: modelId,
			features: asF32,
			sensitiveAttr,
			prediction: Number(prediction),
			timestamp: now,
		});
		console.log(`Stored query as sequence #${seqNum}`);

		// Check if we need to create a batch
		await provider.createBatchIfNeeded();

		// Create signed receipt using provider SDK
		const receipt = await provider.createSignedReceipt({
			seqNum,
			modelId,
			features: asF32,
			sensitiveAttr,
			prediction: Number(prediction),
			timestamp: now,
		});

		return c.json({
			// Inference result
			modelId,
			prediction: Number(prediction),
			timestamp: now,

			// Receipt for user to store
			receipt,
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
		// Use provider SDK's batch manager for proof generation
		const proof = await provider.generateProof(seqNum);

		return c.json({ proof });
	} catch (error) {
		const errorMessage = (error as Error).message;

		// Handle specific error cases
		if (errorMessage.includes("not found")) {
			return c.json({ error: "Query not found" }, 404);
		}
		if (errorMessage.includes("not yet batched")) {
			return c.json(
				{
					error: "Query not yet batched",
					status: "PENDING",
					seqNum,
				},
				400,
			);
		}

		console.error("Proof generation error:", error);
		return c.json({ error: errorMessage }, 500);
	}
});

const port = Number(process.env.PORT) || 5000;

console.log("Starting ZKFair inference server...");

export default {
	port,
	fetch: app.fetch,
};

console.log(`Server running on http://localhost:${port}`);
