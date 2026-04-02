import type { Hash, Hex } from "viem";
import { z } from "zod";

export const HashSchema = z
	.string()
	.startsWith("0x")
	.length(66) as z.ZodType<Hash>;

const MetricSchema = z.enum(["demographic_parity", "equalized_odds"]);

export const PathsFileSchema = z.object({
	dataset: z.string(),
	weights: z.string(),
	fairnessThreshold: z.string(),
});
export type PathsFile = z.infer<typeof PathsFileSchema>;

export const ThresholdsSchema = z.object({
	group_a: z.number(),
	group_b: z.number(),
});
export type Thresholds = z.infer<typeof ThresholdsSchema>;

export const FairnessThresholdFileSchema = z.object({
	metric: MetricSchema,
	targetDisparity: z.number(),
	protectedAttribute: z.string(),
	protectedAttributeIndex: z.number(),
	thresholds: ThresholdsSchema,
	calculatedMetrics: z.record(z.string(), z.number()).optional(),
});
export type FairnessThresholdFile = z.infer<typeof FairnessThresholdFileSchema>;

export const CommitmentsFileSchema = z.object({
	datasetMerkleRoot: HashSchema,
	weightsHash: HashSchema,
});
export type CommitmentsFile = z.infer<typeof CommitmentsFileSchema>;

export const MetadataFileSchema = z.object({
	name: z.string(),
	description: z.string(),
	creator: z.string().optional(),
});
export type MetadataFile = z.infer<typeof MetadataFileSchema>;

export const MetaFileSchema = z.object({
	version: z.number(),
	createdAt: z.number(),
});
export type MetaFile = z.infer<typeof MetaFileSchema>;

export const ProofFileSchema = z.object({
	version: z.number(),
	weightsHash: HashSchema,
	generatedAt: z.number(),
	proof: z.string().startsWith("0x") as z.ZodType<Hex>,
	publicInputs: z.array(HashSchema),
});
export type ProofFile = z.infer<typeof ProofFileSchema>;

export const SaltsFileSchema = z.record(z.string(), z.string());

export const MerkleProofsFileSchema = z.object({
	merklePaths: z.array(z.array(z.string())),
	isEvenFlags: z.array(z.array(z.boolean())),
});

export function parseFairnessThresholdFile(
	data: unknown,
): FairnessThresholdFile {
	return FairnessThresholdFileSchema.parse(data);
}

export function parsePathsFile(data: unknown): PathsFile {
	return PathsFileSchema.parse(data);
}

export function parseCommitmentsFile(data: unknown): CommitmentsFile {
	return CommitmentsFileSchema.parse(data);
}

export function parseProofFile(data: unknown): ProofFile {
	return ProofFileSchema.parse(data);
}
