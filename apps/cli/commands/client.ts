import { command } from "@drizzle-team/brocli";
import * as options from "../cli-args";
import * as commands from "../impl";

export const query = command({
	name: "query",
	desc: "Query a model with IT-MAC protocol for cryptographically verified inference",
	options: options.queryModelOptions,
	handler: commands.queryModel,
});
