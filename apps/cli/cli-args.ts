import { boolean, positional, string } from "@drizzle-team/brocli";

export const getModelOptions = {
	modelHash: positional("model-hash").desc("Hash of the model weights (0x...)"),
	weightsFile: string("weights")
		.alias("w")
		.desc("Path to weights bin file (alternative to hash)"),
};

const datasetAndHashOptions = {
	// NEW: Simple directory option
	dir: string("dir")
		.alias("D")
		.desc("Directory containing model files (weights.bin, dataset.csv, fairness_threshold.json, model.json)"),

	// Fallback to explicit paths (for power users or custom layouts)
	weights: string("weights")
		.alias("w")
		.desc("Path to model weights bin file"),
	data: string("data")
		.alias("d")
		.desc("Path to dataset file (CSV/JSON)"),
	fairnessThreshold: string("fairness-threshold")
		.alias("f")
		.desc("Path to fairness threshold JSON file"),

	encoding: string("encoding")
		.alias("e")
		.enum("MSGPACK", "JSON")
		.default("MSGPACK")
		.desc("Dataset encoding scheme"),
	crypto: string("crypto")
		.alias("c")
		.enum("SHA-256", "BLAKE2b")
		.default("SHA-256")
		.desc("Cryptographic hash algorithm"),
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
	attributes: string("attributes")
		.alias("a")
		.desc("Comma-separated list of protected attributes (or specify in fairness_threshold.json)"),
} as const;

export const getProofStatusOptions = {
	proofHash: positional("proof-hash").desc("Hash of the proof to check"),
	weights: positional("weights")
		.required()
		.desc("Path of the weights bin file to get associated proof"),
};

export const verifyProofOptions = {
	weights: string("weights")
		.alias("w")
		.desc("Path to weights bin file (for weights commitment)"),
	proofHash: positional("proof-hash").desc("Proof hash"),
	publicInputs: positional("public-inputs")
		.required()
		.desc("Comma-separated public inputs OR path to JSON file"),
	local: boolean("local").desc("Verify proof locally instead of onchain (DEV)"),
};
