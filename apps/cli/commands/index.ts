import { command } from "@drizzle-team/brocli";
import { listModels, getModel } from "./model";
import { getProofStatus, proveModelBias } from "./proof";
import { commit as commitSubcmd } from "./commit";
import { verifyProof } from "./verify"

export const model = command({
  name: "model",
  desc: "Manage models",
  subcommands: [listModels, getModel],
});

export const proof = command({
  name: "proof",
  desc: "Manage proofs",
  subcommands: [proveModelBias, getProofStatus],
});

export const commit = command({
  name: "commit",
  desc: "Make commitments for weights and dataset",
  subcommands: [commitSubcmd],
});
export const verify = command({
  name: "verify",
  desc: "Verify proofs",
  subcommands: [verifyProof],
});
