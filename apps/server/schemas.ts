import { z } from "@hono/zod-openapi";

// === Reusable ===

export const ErrorResponseSchema = z
	.object({
		error: z.string(),
	})
	.openapi("ErrorResponse");

// === GET /health ===

export const HealthResponseSchema = z
	.object({
		status: z.literal("ok"),
		loadedModels: z.array(z.number()),
		timestamp: z.number(),
	})
	.openapi("HealthResponse");

// === GET /models ===

export const ModelsResponseSchema = z
	.object({
		models: z.array(z.object({ modelId: z.number() })),
	})
	.openapi("ModelsResponse");

// === POST /predict ===

export const PredictRequestSchema = z
	.object({
		modelHash: z.string().describe("Keccak256 hash of the ONNX model weights"),
		input: z.array(z.number()).describe("Feature vector for model inference"),
	})
	.openapi("PredictRequest");

export const PredictResponseSchema = z
	.object({
		modelId: z.number(),
		prediction: z.number(),
		timestamp: z.number(),
		receipt: z.object({
			seqNum: z.number(),
			modelId: z.number(),
			features: z.array(z.number()),
			sensitiveAttr: z.number(),
			prediction: z.number(),
			timestamp: z.number(),
			dataHash: z.string(),
			featuresHash: z.string(),
			providerSignature: z.string(),
		}),
	})
	.openapi("PredictResponse");

// === GET /proof/:seqNum ===

export const ProofParamsSchema = z.object({
	seqNum: z.coerce
		.number()
		.int()
		.positive()
		.openapi({ param: { name: "seqNum", in: "path" }, example: 1 }),
});

export const ProofResponseSchema = z
	.object({
		proof: z.object({
			index: z.number(),
			siblings: z.array(
				z.object({
					sibling: z.string(),
					position: z.enum(["left", "right"]),
				}),
			),
		}),
	})
	.openapi("ProofResponse");

export const ProofPendingResponseSchema = z
	.object({
		error: z.string(),
		status: z.literal("PENDING"),
		seqNum: z.number(),
	})
	.openapi("ProofPendingResponse");

// === Demo routes ===

export const DemoModeSchema = z.enum([
	"honest",
	"non-inclusion",
	"fraudulent-inclusion",
]);

export const GetDemoModeResponseSchema = z
	.object({
		mode: DemoModeSchema,
	})
	.openapi("DemoModeResponse");

export const SetDemoModeRequestSchema = z
	.object({
		mode: DemoModeSchema,
	})
	.openapi("SetDemoModeRequest");

export const SetDemoModeResponseSchema = z
	.object({
		mode: DemoModeSchema,
		message: z.string(),
	})
	.openapi("SetDemoModeResponse");

export const CommitBatchSuccessResponseSchema = z
	.object({
		success: z.literal(true),
		message: z.string(),
		mode: DemoModeSchema,
		batchId: z.string(),
	})
	.openapi("CommitBatchSuccessResponse");

export const CommitBatchEmptyResponseSchema = z
	.object({
		success: z.literal(false),
		message: z.string(),
	})
	.openapi("CommitBatchEmptyResponse");
