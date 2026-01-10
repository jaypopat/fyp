import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import * as ort from "onnxruntime-node";
import type { Hex } from "viem";
import { z } from "zod";
import { initDatabase } from "./db";
import { loadAllModels } from "./lib/models";
import { provider } from "./lib/sdk";
import { demoRoutes } from "./routes/demo";

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
	console.log(
		`Audit ${result.auditId}: ${result.passed ? "PASSED" : "FAILED"} (${result.txHash})`,
	);
});

// Start periodic batch check - ensures time-based batching works even without new queries
provider.startPeriodicBatchCheck(5 * 60 * 1000); // 5 minutes

// Endpoints

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
app.post(
	"/predict",
	zValidator(
		"json",
		z.object({
			modelHash: z.string(),
			input: z.array(z.number()),
		}),
	),
	async (c) => {
		const { modelHash, input } = c.req.valid("json");

		try {
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
			const inputTensor = new ort.Tensor("float32", Float32Array.from(input), [
				1,
				input.length,
			]);

			const results = await session.run({
				float_input: inputTensor,
			});

			const outputTensor = results.label || results.output0;
			const prediction = outputTensor?.data[0] as number;

			const now = Date.now();
			const asF32 = Array.from(new Float32Array(input));

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
	},
);

/**
 * Get Merkle proof for a query by sequence number
 * Returns ONLY the proof - client should fetch batch data from blockchain
 */
app.get(
	"/proof/:seqNum",
	zValidator(
		"param",
		z.object({
			seqNum: z.coerce.number().int().positive(),
		}),
	),
	async (c) => {
		const { seqNum } = c.req.valid("param");

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
						seqNum: seqNum,
					},
					400,
				);
			}

			console.error("Proof generation error:", error);
			return c.json({ error: errorMessage }, 500);
		}
	},
);

app.route("/demo", demoRoutes);

const port = Number(process.env.PORT) || 5000;

console.log("Starting ZKFair inference server...");

export default {
	port,
	fetch: app.fetch,
};

console.log(`Server running on http://localhost:${port}`);
