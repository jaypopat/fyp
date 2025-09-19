import { positional, string, boolean } from "@drizzle-team/brocli";

export const getModelOptions = {
  modelHash: positional("model-hash").required().desc("Hash of the model"),
};

export const proveModelBiasOptions = {
  model: string("model").alias("m").required().desc("Path to model file"),
  data: string("data").alias("d").required().desc("Path to dataset file (CSV/JSON)"),
  name: string("name").alias("n").desc("Human-readable model name"),
  description: string("description").alias("D").desc("Description of the model"),
  attributes: string("attributes").alias("a").required().desc("Comma-separated list of protected attributes"),
};

export const getProofStatusOptions = {
  proofHash: positional("proof-hash").required().desc("Hash of the proof to check"),
};

export const verifyProofOptions = {
  proofHash: positional("proof-hash").required().desc("Proof hash"),
  publicInputs: positional("public-inputs").required().desc("Comma-separated public inputs OR path to JSON file"),
  local: boolean("local").desc("Verify proof locally instead of onchain (DEV)"),
};

export const commitWeightsOptions = {
  model: string("model").alias("m").required().desc("Path to model file"),
  out: string("out").alias("o").required().desc("Output path for salts JSON file"),
};

export const commitDatasetOptions = {
  data: string("data").alias("d").required().desc("Path to dataset file (CSV/JSON)"),
  schema: string("schema").alias("s").required().desc("Path to dataset schema JSON"),
  out: string("out").alias("o").required().desc("Output path for salts JSON file"),
};
