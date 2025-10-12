// apps/provider-server/src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import * as ort from "onnxruntime-node";
import { join } from "path";

const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", logger());

// Store loaded models in memory
const models = new Map<string, ort.InferenceSession>();
// eg - adult-income -> model.onnx session etc

async function loadAllModels() {
	async function loadModel(modelId: string, modelPath: string) {
		try {
			const modelFile = Bun.file(modelPath);
			const modelBuffer = await modelFile.arrayBuffer();
			const session = await ort.InferenceSession.create(modelBuffer);
			models.set(modelId, session);
			console.log(`✅ Loaded model ${modelId} from ${modelPath}`);
		} catch (error) {
			console.error(`❌ Failed to load model ${modelId}:`, error);
			throw error;
		}
	}

	const examples = join(process.cwd(), "../../examples/");

	// Get all directories in the examples folder using Bun.Glob
	const glob = new Bun.Glob("*/model.onnx");
	const files = await Array.fromAsync(glob.scan({ cwd: examples }));

	for (const file of files) {
		const parts = file.split("/");
		if (parts[0]) {
			const modelName = parts[0];
			const modelPath = join(examples, file);
			await loadModel(modelName, modelPath);
		}
	}
}

// Load all models on startup
await loadAllModels();

app.get("/health", (c) => {
	return c.json({
		status: "ok",
		loadedModels: Array.from(models.keys()),
		timestamp: Date.now(),
	});
});

/**
 * Inference endpoint
 */
app.post("/predict", async (c) => {
	try {
		const body = await c.req.json();
		const { modelId, input } = body;

		// Validate input
		if (!modelId || !input) {
			return c.json({ error: "modelId and input are required" }, 400);
		}

		if (!Array.isArray(input)) {
			return c.json({ error: "input must be an array" }, 400);
		}

		// Get model
		const session = models.get(String(modelId));
		if (!session) {
			return c.json({ error: `Model ${modelId} not found` }, 404);
		}

		// Prepare input tensor
		const inputTensor = new ort.Tensor("float32", Float32Array.from(input), [
			1,
			input.length,
		]);

		// Run inference
		const results = await session.run({
			float_input: inputTensor, // Input name from your ONNX model
		});

		// Extract prediction (adjust based on your model's output)
		const outputTensor = results.label || results.output0;
		const prediction = outputTensor?.data[0] as number;

		console.log(`🧠 Inference for model ${modelId}: ${prediction}`);

		return c.json({
			modelId,
			prediction: Number(prediction),
			timestamp: Date.now(),
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
 * Get model metadata
 */
app.get("/models/:id", async (c) => {
	const modelId = c.req.param("id");

	if (!models.has(modelId)) {
		return c.json({ error: "Model not found" }, 404);
	}

	try {
		const metadataPath = join(
			process.cwd(),
			`../../examples/${modelId}/metadata.json`,
		);
		const metadataFile = Bun.file(metadataPath);
		const metadata = await metadataFile.json();

		return c.json({
			modelId,
			...metadata,
			loaded: true,
		});
	} catch (_e) {
		return c.json({
			modelId,
			loaded: true,
			metadata: null,
		});
	}
}); /**
 * List all loaded models
 */
app.get("/models", (c) => {
	return c.json({
		models: Array.from(models.keys()).map((id) => ({
			modelId: id,
			loaded: true,
		})),
	});
});

// Start server
const port = Number(process.env.PORT) || 5000;

console.log("🚀 Starting ONNX inference server...");

export default {
	port,
	fetch: app.fetch,
};

console.log(`✅ Server running on http://localhost:${port}`);
console.log(`📍 Inference: POST http://localhost:${port}/predict`);
console.log(`📍 Health: GET http://localhost:${port}/health`);
