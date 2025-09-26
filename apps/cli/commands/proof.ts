import { command } from "@drizzle-team/brocli";
import * as options from "../cli-args";
import * as commands from "../impl";

export const proveModelBias = command({
	name: "prove-model-bias",
	desc: "Register model, generate proof of bias, and submit it",
	options: options.proveModelBiasOptions,
	handler: (opts) => commands.proveModelBias(opts),
});

export const getProofStatus = command({
	name: "status",
	desc: "Check proof status for a model file",
	options: options.getProofStatusOptions,
	handler: (opts) => commands.getProofStatus(opts),
});
