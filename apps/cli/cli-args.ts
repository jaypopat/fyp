import { boolean, positional, string } from "@drizzle-team/brocli";

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

export const verifyProofOptions = {
	weights: string("weights")
		.alias("w")
		.desc("Path to weights bin file (for weights commitment)"),
	proofHash: positional("proof-hash").desc(
		"Proof hash - will prompt if not provided",
	),
	publicInputs: positional("public-inputs").desc(
		"Comma-separated public inputs OR path to JSON file - will prompt if not provided",
	),
	local: boolean("local").desc("Verify proof locally instead of onchain (DEV)"),
};

export const queryModelOptions = {
	providerUrl: string("provider-url")
		.alias("u")
		.default("http://localhost:5000")
		.desc("Base URL of the provider server"),
	modelId: positional("model-id").desc(
		"Model ID (hash of weights) - will prompt if not provided",
	),
	input: positional("input").desc(
		"Comma-separated input values (e.g. 0.5,1.2,0.3) - will prompt if not provided",
	),
	macKey: string("mac-key")
		.alias("m")
		.desc("Optional MAC key (32-byte hex) for HMAC verification"),
	queryId: string("query-id")
		.alias("q")
		.desc("Optional query ID (defaults to random UUID)"),
} as const;
