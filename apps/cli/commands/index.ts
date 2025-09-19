import { command } from "@drizzle-team/brocli";
import { listModels, getModel } from "./model";
import { getProofStatus, proveModelBias, verifyProof } from "./proof";
import { commitDataset, commitWeights } from "./commit";

export const model = command({
  name: "model",
  desc: "Manage models",
  subcommands: [listModels, getModel],
});

export const proof = command({
  name: "proof",
  desc: "Manage proofs",
  subcommands: [proveModelBias, getProofStatus, verifyProof],
});

export const commit = command({
  name: "commit",
  desc: "Make commitments for weights and dataset",
  subcommands: [commitDataset, commitWeights],
});
