import { command } from "@drizzle-team/brocli";
import { getModel, listModels } from "./model";
import {
	e2e,
	generateAndSubmit,
	generateProof,
	getProofStatus,
	submitProof,
} from "./proof";

export const model = command({
	name: "model",
	desc: "Manage models",
	subcommands: [listModels, getModel],
});

export const proof = command({
	name: "proof",
	desc: "Manage proofs and certification",
	subcommands: [
		generateAndSubmit,
		generateProof,
		submitProof,
		getProofStatus,
		e2e,
	],
});

export { commit } from "./commit";
