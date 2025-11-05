/**
 * Query Repository - Clean CRUD operations for query logs
 *
 * Type-safe database operations using Drizzle ORM
 */

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "./client";
import { type QueryLog, queryLogs } from "./schema";

/**
 * Insert a new query log
 * Returns the assigned sequence number
 *
 * @throws Error if queryId already exists (UNIQUE constraint)
 */
export async function insertQuery(data: {
	queryId: string;
	modelId: number;
	inputHash: string;
	prediction: number;
	timestamp: number;
}): Promise<number> {
	const result = await db
		.insert(queryLogs)
		.values(data)
		.returning({ seq: queryLogs.seq });

	const seq = result[0]?.seq;
	if (!seq) {
		throw new Error("Failed to insert query - no sequence returned");
	}

	return seq;
}

/**
 * Get total count of all queries
 */
export async function getQueryCount(): Promise<number> {
	const result = await db
		.select({ count: sql<number>`count(*)` })
		.from(queryLogs);

	return result[0]?.count ?? 0;
}

/**
 * Get count of unbatched queries
 */
export async function getUnbatchedCount(): Promise<number> {
	const result = await db
		.select({ count: sql<number>`count(*)` })
		.from(queryLogs)
		.where(isNull(queryLogs.batchId));

	return result[0]?.count ?? 0;
}

/**
 * Get queries with pagination
 * Ordered by sequence number
 */
export async function getQueries(params?: {
	limit?: number;
	offset?: number;
}): Promise<QueryLog[]> {
	const limit = params?.limit ?? 100;
	const offset = params?.offset ?? 0;

	return await db
		.select()
		.from(queryLogs)
		.orderBy(asc(queryLogs.seq))
		.limit(limit)
		.offset(offset);
}

/**
 * Get unbatched queries in sequential order
 * Used for batch creation
 */
export async function getUnbatchedQueries(limit?: number): Promise<{
	queries: QueryLog[];
	sequences: number[];
}> {
	const queries = await db
		.select()
		.from(queryLogs)
		.where(isNull(queryLogs.batchId))
		.orderBy(asc(queryLogs.seq))
		.limit(limit ?? 1000); // Reasonable default

	return {
		queries,
		sequences: queries.map((q) => q.seq),
	};
}

/**
 * Get queries by sequence range (inclusive)
 * Used for batch reconstruction and proofs
 */
export async function getQueriesBySequence(
	startSeq: number,
	endSeq: number,
): Promise<QueryLog[]> {
	return await db
		.select()
		.from(queryLogs)
		.where(
			and(
				sql`${queryLogs.seq} >= ${startSeq}`,
				sql`${queryLogs.seq} <= ${endSeq}`,
			),
		)
		.orderBy(asc(queryLogs.seq));
}

/**
 * Get single query by queryId
 */
export async function getQueryById(
	queryId: string,
): Promise<QueryLog | undefined> {
	const result = await db
		.select()
		.from(queryLogs)
		.where(eq(queryLogs.queryId, queryId))
		.limit(1);

	return result[0];
}

/**
 * Assign queries to a batch (atomic operation)
 * Updates batch_id for specified sequences
 */
export async function assignQueriesToBatch(
	sequences: number[],
	batchId: string,
): Promise<void> {
	if (sequences.length === 0) return;

	await db
		.update(queryLogs)
		.set({ batchId })
		.where(sql`${queryLogs.seq} IN ${sequences}`);
}
