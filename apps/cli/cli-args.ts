import { positional, string, boolean } from "@drizzle-team/brocli";

export const getModelOptions = {
  modelHash: positional("model-id").required().desc("ID of the model"),
};

export const proveModelBiasOptions = {
  model: string("model").alias("m").required().desc("Path to model file"),
  data: string("data").alias("d").required().desc("Path to dataset file (CSV/JSON)"),
  name: string("name").alias("n").desc("Human-readable model name"),
  description: string("description").alias("D").desc("Description of the model"),
  attributes: string("attributes").alias("a").required().desc("Comma-separated list of protected attributes"),
  schema: string("schema").alias("s").desc("Path to dataset schema JSON (optional for commit)"),
  out: string("out").alias("o").desc("Output path for salts JSON file (optional)"),
};

export const getProofStatusOptions = {
  proofHash: positional("proof-hash").desc("Hash of the proof to check"),
  model: positional("model").required().desc("Path of the model to get associated proof"),
};

export const verifyProofOptions = {
  model: string("model").alias("m").desc("Path to model file (for weights commitment)"),
  proofHash: positional("proof-hash").desc("Proof hash"),
  publicInputs: positional("public-inputs").required().desc("Comma-separated public inputs OR path to JSON file"),
  local: boolean("local").desc("Verify proof locally instead of onchain (DEV)"),
};

export const commitOptions = {
  model: string("model").required().alias("m").desc("Path to model file (for weights commitment)"),
  data: string("data").required().alias("d").desc("Path to dataset file (CSV/JSON) (for dataset commitment)"),
  schema: string("schema").alias("s").desc("Path to dataset schema JSON (required when committing dataset)"),
  name: string("name").alias("n").desc("Human-readable model name"),
  description: string("description").alias("D").desc("Description of the model"),
  out: string("out").alias("o").required().desc("Output path for salts JSON file"),
};
