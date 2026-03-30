import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import * as ort from "onnxruntime-node";
import type { Hex } from "viem";
import { initDatabase } from "./db";
import { loadAllModels } from "./lib/models";
import { provider } from "./lib/sdk";
import { demoRoutes } from "./routes/demo";
import {
	ErrorResponseSchema,
	HealthResponseSchema,
	ModelsResponseSchema,
	PredictRequestSchema,
	PredictResponseSchema,
	ProofParamsSchema,
	ProofPendingResponseSchema,
	ProofResponseSchema,
} from "./schemas";

const providerKey = process.env.PRIVATE_KEY as Hex;
if (!providerKey) {
	throw new Error("PRIVATE_KEY is required");
}

const app = new OpenAPIHono();

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

const healthRoute = createRoute({
	method: "get",
	path: "/health",
	tags: ["Health"],
	summary: "Health check",
	description:
		"Returns server status, loaded model IDs, and current timestamp.",
	responses: {
		200: {
			content: { "application/json": { schema: HealthResponseSchema } },
			description: "Server is healthy",
		},
	},
});

app.openapi(healthRoute, (c) => {
	return c.json({
		status: "ok",
		loadedModels: Array.from(registry.sessions.keys()),
		timestamp: Date.now(),
	});
});

const modelsRoute = createRoute({
	method: "get",
	path: "/models",
	tags: ["Inference"],
	summary: "List loaded models",
	description: "Returns all currently loaded ONNX model IDs.",
	responses: {
		200: {
			content: { "application/json": { schema: ModelsResponseSchema } },
			description: "List of loaded models",
		},
	},
});

app.openapi(modelsRoute, (c) => {
	return c.json({
		models: Array.from(registry.sessions.keys()).map((id) => ({
			modelId: id,
		})),
	});
});

const predictRoute = createRoute({
	method: "post",
	path: "/predict",
	tags: ["Inference"],
	summary: "Run model inference",
	description:
		"Submit a feature vector for model inference. Returns prediction with a signed receipt for dispute verification.",
	request: {
		body: {
			content: { "application/json": { schema: PredictRequestSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: PredictResponseSchema } },
			description: "Inference result with signed receipt",
		},
		404: {
			content: { "application/json": { schema: ErrorResponseSchema } },
			description: "Model not found",
		},
		500: {
			content: { "application/json": { schema: ErrorResponseSchema } },
			description: "Inference failed",
		},
	},
});

// @ts-expect-error - OpenAPIHono strict return type checking can't verify discriminated union across multiple c.json() return paths
app.openapi(predictRoute, async (c) => {
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
});

const proofRoute = createRoute({
	method: "get",
	path: "/proof/{seqNum}",
	tags: ["Proofs"],
	summary: "Get Merkle proof for a query",
	description:
		"Returns the Merkle proof for a batched query by sequence number. Client should fetch batch data from the blockchain separately.",
	request: {
		params: ProofParamsSchema,
	},
	responses: {
		200: {
			content: { "application/json": { schema: ProofResponseSchema } },
			description: "Merkle proof for the query",
		},
		400: {
			content: {
				"application/json": { schema: ProofPendingResponseSchema },
			},
			description: "Query not yet batched",
		},
		404: {
			content: { "application/json": { schema: ErrorResponseSchema } },
			description: "Query not found",
		},
		500: {
			content: { "application/json": { schema: ErrorResponseSchema } },
			description: "Proof generation failed",
		},
	},
});

// @ts-expect-error - OpenAPIHono strict return type checking can't verify discriminated union across multiple c.json() return paths
app.openapi(proofRoute, async (c) => {
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
});

app.route("/demo", demoRoutes);

// OpenAPI spec + Scalar UI

app.doc("/openapi.json", {
	openapi: "3.1.0",
	info: {
		title: "zkFair Provider API",
		version: "1.0.0",
		description:
			"ML inference provider server for the zkFair protocol. Runs ONNX model inference, logs queries, commits batches, and generates Merkle proofs.",
	},
	tags: [
		{ name: "Health", description: "Server health and status" },
		{ name: "Inference", description: "Model inference and predictions" },
		{ name: "Proofs", description: "Merkle proof generation" },
		{ name: "Demo", description: "Demo mode controls for testing disputes" },
	],
});

app.get(
	"/reference",
	apiReference({
		url: "/openapi.json",
		theme: "kepler",
	}),
);

const port = Number(process.env.PORT) || 5000;

console.log(`Starting ZKFair inference server on http://localhost:${port}`);

export default {
	port,
	fetch: app.fetch,
};
