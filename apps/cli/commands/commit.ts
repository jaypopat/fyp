import { command } from "@drizzle-team/brocli";
import * as options from "../cli-args";
import * as commands from "../impl";

export const commit = command({
	name: "commit",
	desc: "Commit weights and dataset (publish commitment onchain)",
	options: options.commitOptions,
	handler: commands.commit,
});
