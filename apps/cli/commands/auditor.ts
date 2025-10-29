import { command } from "@drizzle-team/brocli";
import * as options from "../cli-args";
import * as commands from "../impl";

export const listBatches = command({
	name: "batches",
	desc: "List finalized batches from provider",
	options: options.listBatchesOptions,
	handler: commands.auditListBatches,
});

export const getBatch = command({
	name: "batch",
	desc: "Get a batch by id",
	options: options.getBatchOptions,
	handler: commands.auditGetBatch,
});

export const verifyMembership = command({
	name: "verify-membership",
	desc: "Verify a query's membership in a batch (Merkle proof)",
	options: options.batchProofOptions,
	handler: commands.auditVerifyBatchMembership,
});
