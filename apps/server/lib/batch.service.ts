import type { AuditRecord } from "@zkfair/sdk";
import {
	assignQueriesToBatch,
	type Batch,
	createBatch,
	getAllBatches,
	getBatchById,
	getQueriesBySequence,
	getUnbatchedCount,
	getUnbatchedQueries,
	type QueryLog,
	updateBatchTxHash,
	withTransaction,
} from "../db";
import { sdk } from "./sdk";

/**
 * Convert QueryLog to AuditRecord format for SDK
 */
export function toAuditRecord(query: QueryLog): AuditRecord {
	return {
		queryId: query.queryId,
		modelId: query.modelId,
		features: query.features,
		sensitiveAttr: query.sensitiveAttr,
		prediction: query.prediction,
		timestamp: query.timestamp,
	};
}

/**
 * Create a batch from unbatched queries if we have enough
 */
export async function createBatchIfNeeded(): Promise<Batch | undefined> {
	const batchSize = Number(process.env.BATCH_SIZE) || 100;
	const unbatchedCount = await getUnbatchedCount();

	if (unbatchedCount < batchSize) {
		return undefined;
	}

	// Get unbatched queries
	const { queries, sequences } = await getUnbatchedQueries(batchSize);

	if (queries.length < batchSize) {
		return undefined;
	}

	// Validate no gaps in sequence
	const sorted = [...sequences].sort((a, b) => a - b);
	for (let i = 0; i < sorted.length - 1; i++) {
		const curr = sorted[i];
		const next = sorted[i + 1];
		if (curr === undefined || next === undefined || next - curr !== 1) {
			throw new Error(`Gap in sequences at ${curr}`);
		}
	}

	const startSeq = sorted[0];
	const endSeq = sorted[sorted.length - 1];
	if (startSeq === undefined || endSeq === undefined) {
		throw new Error("Invalid sequence range");
	}

	const batchId = `${startSeq}-${endSeq}`;

	const auditRecords = queries.map(toAuditRecord);
	const { root } = await sdk.audit.buildBatch(auditRecords);

	const startTime = Math.min(...queries.map((q) => q.timestamp));
	const endTime = Math.max(...queries.map((q) => q.timestamp));
	const firstQuery = queries[0];
	if (!firstQuery) {
		throw new Error("No queries found in batch");
	}
	const modelId = firstQuery.modelId;

	console.log(`Creating batch ${batchId}...`);

	const batch = await withTransaction(async () => {
		const newBatch = await createBatch({
			id: batchId,
			startSeq,
			endSeq,
			merkleRoot: root,
			recordCount: queries.length,
			txHash: null,
			createdAt: Date.now(),
			committedAt: null,
		});

		await assignQueriesToBatch(sequences, batchId);
		return newBatch;
	});

	console.log(`Batch ${batchId} created with root ${root}`);

	console.log(
		`Committing batch ${batchId} to blockchain for model ${modelId}...`,
	);
	try {
		const txHash = await sdk.audit.commitBatch(
			BigInt(modelId),
			root,
			BigInt(queries.length),
			BigInt(startTime),
			BigInt(endTime),
		);
		await updateBatchTxHash(batchId, txHash);
		console.log(`Batch ${batchId} committed with tx: ${txHash}`);
	} catch (error) {
		console.error(
			`Blockchain commit failed for batch ${batchId}:`,
			error instanceof Error ? error.message : error,
		);
		console.error("Full error:", error);
	}

	return batch;
}

/**
 * List all batches
 */
export async function listBatches(): Promise<Batch[]> {
	return await getAllBatches();
}

/**
 * Get batch by ID
 */
export async function findBatchById(id: string): Promise<Batch | undefined> {
	return await getBatchById(id);
}

/**
 * Generate Merkle proof for a query in a batch
 */
export async function generateProof(params: {
	batchId: string;
	queryId: string;
}): Promise<{
	root: `0x${string}`;
	index: number;
	proof: { sibling: string; position: "left" | "right" }[];
}> {
	const batch = await getBatchById(params.batchId);
	if (!batch) {
		throw new Error(`Batch not found: ${params.batchId}`);
	}

	// Get queries from database by sequence range
	const queries = await getQueriesBySequence(batch.startSeq, batch.endSeq);
	const auditRecords = queries.map(toAuditRecord);

	const result = await sdk.audit.createProof(auditRecords, params.queryId);

	return {
		root: batch.merkleRoot as `0x${string}`,
		index: result.index,
		proof: result.proof,
	};
}
