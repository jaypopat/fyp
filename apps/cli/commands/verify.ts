import { command } from "@drizzle-team/brocli";
import * as options from "../cli-args";
import * as commands from "../impl";

export const verifyProof = command({
	name: "verify",
	desc: "Verify proof locally or onchain",
	options: options.verifyProofOptions,
	handler: (opts) => commands.verifyProof(opts),
});
