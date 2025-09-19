import { SDK } from "@zkfair/sdk";
import path from "path";
import { type TypeOf } from "@drizzle-team/brocli";

import type {
  getModelOptions,
  proveModelBiasOptions,
  getProofStatusOptions,
  verifyProofOptions,
  commitDatasetOptions,
  commitWeightsOptions,
} from "./cli-args";

export type GetModelOpts = TypeOf<typeof getModelOptions>;
export type ProveModelBiasOpts = TypeOf<typeof proveModelBiasOptions>;
export type GetProofStatusOpts = TypeOf<typeof getProofStatusOptions>;
export type VerifyProofOpts = TypeOf<typeof verifyProofOptions>;
export type CommitDatasetOpts = TypeOf<typeof commitDatasetOptions>;
export type CommitWeightsOpts = TypeOf<typeof commitWeightsOptions>;

const zkFairSDK = new SDK({ rpcUrl: process.env.RPC_URL || "", privateKey: process.env.PRIVATE_KEY || "" });

export async function listModels() {
  console.log("Fetching all registered models...");
  const models = await zkFairSDK.model.list();
  return models;
}

export function getModel(options: GetModelOpts) {
  console.log("Fetching model", options.modelHash);
  const model = zkFairSDK.model.get(options.modelHash);
  return model;
}

export function proveModelBias(opts: ProveModelBiasOpts) {
  console.log("Proving model fairness:", opts);
  // 1. Ensure model is registered (register if missing)
  // 2. Calculate fairness metrics using fairlearn
  // 3. Generate zk proof (bb.js / noir)
  // 4. Submit proof onchain
}

export function getProofStatus(options: GetProofStatusOpts) {
  console.log("Checking proof status for:", options.proofHash);
  // TODO: contract lookup
}

export function verifyProof(options: VerifyProofOpts) {

  let publicInputs = options.publicInputs.split(",");
  if (options.local) {
    console.log("Local verification of proof:", options.proofHash);
    // TODO: bb.js local verification
  } else {
    console.log("Onchain verification of proof:", options.proofHash);
    // TODO: contract call
  }
}

export function commitDataset(opts: CommitDatasetOpts) {
  console.log("Committing dataset:", opts.data);

  const salts = {}; // placeholder: generate random salt per row
  const output = path.resolve(opts.out);
  Bun.write(output, JSON.stringify(salts, null, 2));

  console.log(`✅ Dataset committed. Salts written to ${output}`);
}

export function commitWeights(opts: CommitWeightsOpts) {
  console.log("Committing model weights:", opts.model);

  const salts = {}; // placeholder: random salt for weight vals
  const output = path.resolve(opts.out);
  Bun.write(output, JSON.stringify(salts, null, 2));

  console.log(`✅ Weights committed. Salts written to ${output}`);
}
