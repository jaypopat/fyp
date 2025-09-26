import { command } from "@drizzle-team/brocli";
import * as options from "../cli-args";
import * as commands from "../impl";

export const listModels = command({
	name: "list",
	desc: "List all registered models",
	handler: commands.listModels,
});

export const getModel = command({
	name: "get",
	desc: "Get model by hash",
	options: options.getModelOptions,
	handler: (opts) => commands.getModel(opts),
});
