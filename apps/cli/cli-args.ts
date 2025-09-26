import { positional, string, boolean } from "@drizzle-team/brocli";

export const getModelOptions = {
  modelHash: positional("model-hash").desc("Hash of the model weights (0x...)"),
  weightsFile: string("weights").alias("w").desc("Path to weights JSON file (alternative to hash)"),
};

export const proveModelBiasOptions = {
  weights: string("weights").required().alias("w").desc("Path to model weights JSON file"),
  data: string("data").alias("d").required().desc("Path to dataset file (CSV/JSON)"),
  name: string("name").required().alias("n").desc("Human-readable model name"),
  description: string("description").required().alias("D").desc("Description of the model"),
  attributes: string("attributes").alias("a").required().desc("Comma-separated list of protected attributes"),
  schema: string("schema").alias("s").desc("Path to dataset schema JSON (optional for commit)"),
  out: string("out").alias("o").desc("Output path for salts JSON file (optional)"),
};

export const getProofStatusOptions = {
  proofHash: positional("proof-hash").desc("Hash of the proof to check"),
  weights: positional("weights").required().desc("Path of the weights JSON file to get associated proof"),
};

export const verifyProofOptions = {
  weights: string("weights").alias("w").desc("Path to weights JSON file (for weights commitment)"),
  proofHash: positional("proof-hash").desc("Proof hash"),
  publicInputs: positional("public-inputs").required().desc("Comma-separated public inputs OR path to JSON file"),
  local: boolean("local").desc("Verify proof locally instead of onchain (DEV)"),
};

export const commitOptions = {
  weights: string("weights").required().alias("w").desc("Path to model weights JSON file (for weights commitment)"),
  data: string("data").required().alias("d").desc("Path to dataset file (CSV/JSON) (for dataset commitment)"),
  schema: string("schema").alias("s").desc("Path to dataset schema JSON (required when committing dataset)"),
  name: string("name").required().alias("n").desc("Human-readable model name"),
  description: string("description").required().alias("D").desc("Description of the model"),
  out: string("out").alias("o").required().desc("Output path for salts JSON file"),
};
