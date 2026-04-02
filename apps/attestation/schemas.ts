import { z } from "@hono/zod-openapi";

const HexString = z
	.string()
	.regex(/^0x[0-9a-fA-F]+$/)
	.describe("Hex-encoded string with 0x prefix");

export const ErrorResponseSchema = z
	.object({
		error: z.string(),
		details: z.string().optional(),
	})
	.openapi("ErrorResponse");

export const HealthResponseSchema = z
	.object({
		status: z.literal("ok"),
		attestor: z
			.string()
			.describe("Ethereum address of the attestation service"),
	})
	.openapi("HealthResponse");

export const TrainingRequestSchema = z
	.object({
		proof: HexString.describe("Hex-encoded UltraHonk proof"),
		publicInputs: z.array(HexString).describe("Public inputs for the circuit"),
		weightsHash: HexString.describe("Keccak256 hash of the model weights"),
	})
	.openapi("TrainingAttestationRequest");

export const TrainingResponseSchema = z
	.object({
		attestationHash: z.string(),
		signature: z.string(),
		passed: z.literal(true),
	})
	.openapi("TrainingAttestationResponse");

export const AuditRequestSchema = z
	.object({
		proof: HexString.describe("Hex-encoded UltraHonk proof"),
		publicInputs: z.array(HexString).describe("Public inputs for the circuit"),
		auditId: z
			.union([z.string(), z.number()])
			.describe("On-chain audit identifier"),
	})
	.openapi("AuditAttestationRequest");

export const AuditResponseSchema = z
	.object({
		auditId: z.union([z.string(), z.number()]),
		attestationHash: z.string(),
		passed: z.boolean(),
		signature: z.string(),
	})
	.openapi("AuditAttestationResponse");

export const DisputeRequestSchema = z
	.object({
		batchId: z.union([z.string(), z.number()]).describe("On-chain batch ID"),
		receipt: z
			.object({
				seqNum: z.number(),
				modelId: z.number(),
				features: z.array(z.number()),
				sensitiveAttr: z.number(),
				prediction: z.number(),
				timestamp: z.number(),
			})
			.describe("Signed inference receipt from the provider"),
		featuresHash: HexString.describe("Keccak256 hash of the feature vector"),
		providerSignature: HexString.describe(
			"Provider's EIP-191 signature on the receipt",
		),
		merkleProof: z
			.array(
				z.object({
					sibling: z.string(),
					position: z.enum(["left", "right"]),
				}),
			)
			.describe("Merkle proof path from leaf to root"),
	})
	.openapi("DisputeAttestationRequest");

export const DisputeResponseSchema = z
	.object({
		attestationHash: z.string(),
		signature: z.string(),
	})
	.openapi("DisputeAttestationResponse");
