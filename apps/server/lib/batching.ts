import type { AuditBatch, AuditRecord } from "@zkfair/sdk/types";
import { getRecordCount, getRecords } from "./db";
import { sdk } from "./sdk";
import type { Hex, QueryLogRecord } from "./types";
export function toAuditRecord(record: QueryLogRecord): AuditRecord {
	return {
		queryId: record.queryId,
		modelId: record.modelId,
		inputHash: record.inputHash,
		prediction: record.prediction,
		timestamp: record.timestamp,
	};
}

const BATCHES_URL = new URL("../batches.json", import.meta.url);
let batchesCache: AuditBatch[] = [];

async function readBatches(): Promise<AuditBatch[]> {
	try {
		const f = Bun.file(BATCHES_URL);
		if (!(await f.exists())) return [];
		const json = await f.json();
		return Array.isArray(json) ? (json as AuditBatch[]) : [];
	} catch {
		return [];
	}
}
async function writeBatches(data: AuditBatch[]): Promise<void> {
	await Bun.write(BATCHES_URL, JSON.stringify(data, null, 2));
}

export async function initBatches() {
	batchesCache = await readBatches();
}

export function listBatches(): AuditBatch[] {
	return batchesCache.slice();
}

export function getBatchById(id: string): AuditBatch | undefined {
	return batchesCache.find((b) => b.id === id);
}

export async function createBatchIfNeeded(
	batchSize: number,
): Promise<AuditBatch[] | undefined> {
	const count = getRecordCount();
	if (count < batchSize) return;
	// Number of complete batches that should exist now
	const shouldExist = Math.floor(count / batchSize);
	const have = batchesCache.length;
	if (have >= shouldExist) return; // nothing to do

	const created: AuditBatch[] = [];
	for (let b = have; b < shouldExist; b++) {
		const startIndex = b * batchSize;
		const endIndex = startIndex + batchSize - 1;
		const slice = await getRecords({ offset: startIndex, limit: batchSize });
		if (slice.length !== batchSize) break; // safety

		const auditRecords = slice.map(toAuditRecord);
		const { root } = await sdk.audit.buildBatch(auditRecords);

		// Get batch time range and modelId from records
		const timestamps = slice.map((r) => r.timestamp);
		const startTime = Math.min(...timestamps);
		const endTime = Math.max(...timestamps);
		const modelId = slice[0]?.modelId ?? 0; // Assume all records in batch are same model

		console.log(`📝 Committing batch ${startIndex}-${endIndex} to contract...`);
		try {
			const txHash = await sdk.audit.commitBatch(
				BigInt(modelId),
				root,
				BigInt(batchSize),
				BigInt(startTime),
				BigInt(endTime),
			);
			console.log(`✅ Batch committed on-chain: ${txHash}`);
		} catch (error) {
			console.error("❌ Failed to commit batch on-chain:", error);
			return;
		}

		const meta: AuditBatch = {
			id: `${startIndex}-${endIndex}`,
			startIndex,
			endIndex,
			count: batchSize,
			root,
			leafAlgo: "SHA-256",
			leafSchema: "MSGPACK",
			createdAt: Date.now(),
		};
		batchesCache.push(meta);
		created.push(meta);
	}
	if (created.length) await writeBatches(batchesCache);
	return created;
}

export async function computeProofForQueryInBatch(params: {
	batchId: string;
	queryId: string;
}): Promise<{
	root: Hex;
	index: number;
	proof: { sibling: string; position: "left" | "right" }[];
}> {
	const batch = getBatchById(params.batchId);
	if (!batch) throw new Error("Batch not found");
	const slice = await getRecords({
		offset: batch.startIndex,
		limit: batch.count,
	});

	const auditRecords = slice.map(toAuditRecord);
	const result = await sdk.audit.createProof(auditRecords, params.queryId);

	return { root: batch.root, index: result.index, proof: result.proof };
}
