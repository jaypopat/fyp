import { command } from "@drizzle-team/brocli";
import { getBatch, listBatches, verifyMembership } from "./auditor";
import { query } from "./client";
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

export const auditor = command({
	name: "audit",
	desc: "Audit models",
	subcommands: [listBatches, getBatch, verifyMembership],
});
export const client = command({
	name: "client",
	desc: "Client operations (query models, run inference)",
	subcommands: [query],
});

export { commit } from "./commit";
export { verify } from "./verify";
