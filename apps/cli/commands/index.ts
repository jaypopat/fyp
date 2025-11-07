import { command } from "@drizzle-team/brocli";
import { getModel, listModels } from "./model";
import { getProofStatus, proveModelBias } from "./proof";

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

export { commit } from "./commit";
export { verify } from "./verify";
