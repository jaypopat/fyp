import { command } from "@drizzle-team/brocli";
import * as commands from "../impl";
import * as options from "../cli-args";

export const commit = command({
  name: "commit",
  desc: "Commit weights and dataset (publish commitment onchain)",
  options: options.commitOptions,
  handler: commands.commit,
});
