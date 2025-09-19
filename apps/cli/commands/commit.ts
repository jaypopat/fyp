import { command } from "@drizzle-team/brocli";
import * as commands from "../impl";
import * as options from "../cli-args";

export const commitWeights = command({
  name: "weights",
  desc: "Commit weights (publish weight + salt hash onchain)",
  options: options.commitWeightsOptions,
  handler: commands.commitWeights,
});

export const commitDataset = command({
  name: "dataset",
  desc: "Commit dataset (publish Merkle root onchain)",
  options: options.commitDatasetOptions,
  handler: commands.commitDataset,
});
