import { positional, string } from "@drizzle-team/brocli";

export const getModelOptions = {
	modelHash: positional("model-hash").desc(
		"Hash of the model weights (0x...) - will prompt if not provided",
	),
	weightsFile: string("weights")
		.alias("w")
		.desc("Path to weights bin file (alternative to hash)"),
};

const datasetAndHashOptions = {
	dir: string("dir")
		.alias("D")
		.desc(
			"Directory containing model files (weights.bin, dataset_encoded.csv, fairness_threshold.json, model.json)",
		),

	// Fallback to explicit paths (for power users or custom layouts)
	weights: string("weights").alias("w").desc("Path to model weights bin file"),
	data: string("data").alias("d").desc("Path to encoded dataset file (CSV)"),
	fairnessThreshold: string("fairness-threshold")
		.alias("f")
		.desc("Path to fairness threshold JSON file"),
} as const;

const modelMetadataOptions = {
	name: string("name")
		.alias("n")
		.desc("Human-readable model name (or specify in model.json)"),
	description: string("description")
		.alias("desc")
		.desc("Description of the model (or specify in model.json)"),
	creator: string("creator")
		.alias("C")
		.desc("Creator / author identifier (or specify in model.json)"),
} as const;

export const commitOptions = {
	...datasetAndHashOptions,
	...modelMetadataOptions,
} as const;

export const proveModelBiasOptions = {
	...datasetAndHashOptions,
	...modelMetadataOptions,
} as const;

export const getProofStatusOptions = {
	proofHash: positional("proof-hash").desc(
		"Hash of the proof to check - will prompt if not provided",
	),
	weights: positional("weights").desc(
		"Path of the weights bin file to get associated proof",
	),
};
