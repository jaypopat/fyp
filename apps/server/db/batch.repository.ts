import { asc, eq, sql } from "drizzle-orm";
import { db } from "./client";
import { type Batch, batches, type NewBatch } from "./schema";

/**
 * Create a new batch
 */
export async function createBatch(data: NewBatch): Promise<Batch> {
	const result = await db.insert(batches).values(data).returning();

	const batch = result[0];
	if (!batch) {
		throw new Error("Failed to create batch");
	}

	return batch;
}

/**
 * Get all batches, ordered by sequence
 */
export async function getAllBatches(): Promise<Batch[]> {
	return await db.select().from(batches).orderBy(asc(batches.startSeq));
}

/**
 * Get batch by ID
 */
export async function getBatchById(id: string): Promise<Batch | undefined> {
	const result = await db
		.select()
		.from(batches)
		.where(eq(batches.id, id))
		.limit(1);

	return result[0];
}

/**
 * Get batch containing a specific sequence number
 */
export async function getBatchBySequence(
	seq: number,
): Promise<Batch | undefined> {
	const result = await db
		.select()
		.from(batches)
		.where(sql`${batches.startSeq} <= ${seq} AND ${batches.endSeq} >= ${seq}`)
		.limit(1);

	return result[0];
}

/**
 * Update batch with transaction hash after blockchain commit
 */
export async function updateBatchTxHash(
	batchId: string,
	txHash: string,
): Promise<void> {
	await db
		.update(batches)
		.set({
			txHash,
			committedAt: Date.now(),
		})
		.where(eq(batches.id, batchId));
}

/**
 * Get total batch count
 */
export async function getBatchCount(): Promise<number> {
	const result = await db
		.select({ count: sql<number>`count(*)` })
		.from(batches);

	return result[0]?.count ?? 0;
}
