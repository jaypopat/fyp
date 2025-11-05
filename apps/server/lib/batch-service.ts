import type { AuditRecord } from "@zkfair/sdk/types";
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
		inputHash: query.inputHash as `0x${string}`,
		prediction: query.prediction,
		timestamp: query.timestamp,
	};
}

/**
 * Validate sequence numbers are contiguous with no gaps
 * Prevents selective query omission attacks
 */
function validateSequences(sequences: number[], expectedCount: number): void {
	if (sequences.length === 0) {
		throw new Error("Cannot validate empty sequence array");
	}

	if (sequences.length !== expectedCount) {
		throw new Error(
			`Expected ${expectedCount} sequences, got ${sequences.length}`,
		);
	}

	// Sort and check for gaps
	const sorted = [...sequences].sort((a, b) => a - b);
	const startSeq = sorted[0];
	const endSeq = sorted[sorted.length - 1];

	if (startSeq === undefined || endSeq === undefined) {
		throw new Error("Invalid sequence array");
	}

	// Verify range completeness
	const expectedRange = endSeq - startSeq + 1;
	if (expectedRange !== expectedCount) {
		throw new Error(
			`Gap detected: range ${startSeq}-${endSeq} spans ${expectedRange} positions but only ${expectedCount} records present`,
		);
	}

	// Verify strict sequential order
	for (let i = 0; i < sorted.length - 1; i++) {
		const current = sorted[i];
		const next = sorted[i + 1];
		if (current === undefined || next === undefined) {
			throw new Error(`Invalid sequence at index ${i}`);
		}
		if (next - current !== 1) {
			throw new Error(`Gap between sequence ${current} and ${next}`);
		}
	}
}

/**
 * Create batches from unbatched queries
 * Returns created batches or undefined if not enough queries
 */
export async function createBatchesIfNeeded(
	batchSize: number,
): Promise<Batch[] | undefined> {
	const unbatchedCount = await getUnbatchedCount();

	if (unbatchedCount < batchSize) {
		return undefined; // Not enough queries
	}

	const numBatches = Math.floor(unbatchedCount / batchSize);
	const created: Batch[] = [];

	// Create batches one at a time
	for (let i = 0; i < numBatches; i++) {
		try {
			const batch = await createSingleBatch(batchSize);
			if (batch) {
				created.push(batch);
			} else {
				break; // No more unbatched queries
			}
		} catch (error) {
			console.error(`Failed to create batch ${i}:`, error);
			break;
		}
	}

	return created.length > 0 ? created : undefined;
}

/**
 * Create a single batch atomically
 */
async function createSingleBatch(
	batchSize: number,
): Promise<Batch | undefined> {
	// Get unbatched queries
	const { queries, sequences } = await getUnbatchedQueries(batchSize);

	if (queries.length < batchSize) {
		return undefined; // Not enough queries
	}

	// Validate no gaps
	validateSequences(sequences, batchSize);

	const startSeq = sequences[0];
	const endSeq = sequences[sequences.length - 1];

	if (startSeq === undefined || endSeq === undefined) {
		throw new Error("Invalid sequence range");
	}

	const batchId = `${startSeq}-${endSeq}`;

	// Check if batch already exists
	const existing = await getBatchById(batchId);
	if (existing) {
		console.warn(`Batch ${batchId} already exists, skipping`);
		return undefined;
	}

	// Build Merkle tree
	const auditRecords = queries.map(toAuditRecord);
	const { root } = await sdk.audit.buildBatch(auditRecords);

	// Get time range and model ID
	const timestamps = queries.map((q) => q.timestamp);
	const startTime = Math.min(...timestamps);
	const endTime = Math.max(...timestamps);
	const modelId = queries[0]?.modelId ?? 0;

	console.log(`📝 Creating batch ${batchId}...`);

	// Create batch and assign queries atomically
	const batch = await withTransaction(async () => {
		// Insert batch metadata
		const newBatch = await createBatch({
			id: batchId,
			startSeq,
			endSeq,
			merkleRoot: root,
			recordCount: batchSize,
			leafAlgo: "SHA-256",
			leafSchema: "MSGPACK",
			txHash: null,
			createdAt: Date.now(),
			committedAt: null,
		});

		// Assign queries to batch
		await assignQueriesToBatch(sequences, batchId);

		return newBatch;
	});

	console.log(`✅ Batch ${batchId} created with root ${root.slice(0, 10)}...`);

	// Commit to blockchain asynchronously
	commitBatchToBlockchain(
		batchId,
		modelId,
		root,
		batchSize,
		startTime,
		endTime,
	).catch((error) => {
		console.error(`❌ Blockchain commit failed for batch ${batchId}:`, error);
	});

	return batch;
}

/**
 * Commit batch to blockchain and update tx hash
 */
async function commitBatchToBlockchain(
	batchId: string,
	modelId: number,
	root: `0x${string}`,
	batchSize: number,
	startTime: number,
	endTime: number,
): Promise<void> {
	console.log(`⛓️  Committing batch ${batchId} to blockchain...`);

	const txHash = await sdk.audit.commitBatch(
		BigInt(modelId),
		root,
		BigInt(batchSize),
		BigInt(startTime),
		BigInt(endTime),
	);

	// Update batch with tx hash
	await updateBatchTxHash(batchId, txHash);

	console.log(`✅ Batch ${batchId} committed: ${txHash}`);
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
