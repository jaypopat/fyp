import { command } from "@drizzle-team/brocli";
import * as commands from "../impl";
import * as options from "../cli-args";

export const verifyProof = command({
  name: "verify",
  desc: "Verify proof locally or onchain",
  options: options.verifyProofOptions,
  handler: (opts) => commands.verifyProof(opts)
});
