import { command } from "@drizzle-team/brocli";
import * as options from "../cli-args";
import * as commands from "../impl";

export const e2e = command({
	name: "e2e",
	desc: "End-to-end demo: Register model, generate proof, and submit (testing)",
	options: options.e2eOptions,
	handler: (opts) => commands.e2e(opts),
});

export const generateProof = command({
	name: "generate",
	desc: "Generate ZK proof for a committed model (saves to disk)",
	options: options.generateProofOptions,
	handler: (opts) => commands.generateProof(opts),
});

export const submitProof = command({
	name: "submit",
	desc: "Submit an existing proof to the contract",
	options: options.submitProofOptions,
	handler: (opts) => commands.submitProof(opts),
});

export const generateAndSubmit = command({
	name: "generate-and-submit",
	desc: "Generate proof and submit to contract in one step",
	options: options.generateProofOptions,
	handler: (opts) => commands.generateAndSubmit(opts),
});

export const getProofStatus = command({
	name: "status",
	desc: "Check certification status for a model",
	options: options.getProofStatusOptions,
	handler: (opts) => commands.getProofStatus(opts),
});
