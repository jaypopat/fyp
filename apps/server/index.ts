import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import * as ort from "onnxruntime-node";
import { initDatabase, insertQuery } from "./db";
import { handleAuditRequest } from "./lib/audit";
import { createBatchIfNeeded } from "./lib/batch.service";
import { loadAllModels } from "./lib/models";
import { sdk } from "./lib/sdk";

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

const models = await loadAllModels();

initDatabase();

sdk.events.watchAuditRequested(handleAuditRequest);

// ============================================
// ENDPOINTS
// ============================================

app.get("/health", (c) => {
	return c.json({
		status: "ok",
		loadedModels: Array.from(models.keys()),
		timestamp: Date.now(),
	});
});

app.get("/models", (c) => {
	return c.json({
		models: Array.from(models.keys()).map((id) => ({
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
		const { modelId, input, queryId } = body as {
			modelId: number;
			input: unknown;
			queryId?: string;
		};

		// Validate input
		if (modelId === undefined || input === undefined) {
			return c.json({ error: "modelId and input are required" }, 400);
		}

		// For demo models, we expect a numeric array
		if (!Array.isArray(input)) {
			return c.json({ error: "input must be an array" }, 400);
		}

		// Get model
		const session = models.get(modelId);
		if (!session) {
			return c.json({ error: `Model ${modelId} not found` }, 404);
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

		const qid = queryId ?? globalThis.crypto?.randomUUID?.() ?? `${now}`;

		console.log(`Inference for model ${modelId}: ${prediction}`);

		const seqNum = await insertQuery({
			queryId: qid,
			modelId: modelId,
			features: asF32,
			sensitiveAttr: Number(input[9] || 0), // sex attribute
			prediction: Number(prediction),
			timestamp: now,
		});
		console.log(`Stored query ${qid} as sequence #${seqNum}`);

		await createBatchIfNeeded();

		return c.json({
			modelId,
			prediction: Number(prediction),
			timestamp: now,
			seqNum,
			queryId: qid,
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

const port = Number(process.env.PORT) || 5000;

console.log("Starting ZKFair inference server...");

export default {
	port,
	fetch: app.fetch,
};

console.log(`Server running on http://localhost:${port}`);
