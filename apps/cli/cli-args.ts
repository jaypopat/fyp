import { boolean, positional, string } from "@drizzle-team/brocli";

export const getModelOptions = {
  modelHash: positional("model-hash").desc("Hash of the model weights (0x...)"),
  weightsFile: string("weights")
    .alias("w")
    .desc("Path to weights bin file (alternative to hash)"),
};

const datasetAndHashOptions = {
  weights: string("weights")
    .required()
    .alias("w")
    .desc("Path to model weights bin file"),
  data: string("data")
    .required()
    .alias("d")
    .desc("Path to dataset file (CSV/JSON)"),
  encoding: string("encoding")
    .alias("e")
    .enum("MSGPACK", "JSON")
    .default("MSGPACK")
    .desc("Dataset encoding scheme"),
  crypto: string("crypto")
    .alias("c")
    .enum("SHA-256", "BLAKE2b")
    .default("SHA-256")
    .desc("Cryptographic hash algorithm (default SHA-256)"),
} as const;

const modelMetadataOptions = {
  name: string("name")
    .required()
    .alias("n")
    .desc("Human-readable model name"),
  description: string("description")
    .required()
    .alias("D")
    .desc("Description of the model"),
  creator: string("creator")
    .alias("C")
    .desc("Creator / author identifier (string, stored in metadata)"),
  version: string("version")
    .alias("V")
    .default("1.0.0")
    .desc("Semantic model version (e.g. 1.0.0)"),
} as const;

export const proveModelBiasOptions = {
  ...datasetAndHashOptions,
  ...modelMetadataOptions,
  
  attributes: string("attributes")
    .required()
    .alias("a")
    .desc("Comma-separated list of protected attributes"),
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

export const commitOptions = {
  ...datasetAndHashOptions,
  ...modelMetadataOptions,
} as const;
