/**
 * Database Module - Clean exports
 */

// Batch operations
export {
	createBatch,
	getAllBatches,
	getBatchById,
	getBatchBySequence,
	getBatchCount,
	updateBatchTxHash,
} from "./batches";
// Client
export { db } from "./client";

// Query operations
export {
	assignQueriesToBatch,
	getQueries,
	getQueriesBySequence,
	getQueryById,
	getQueryCount,
	getUnbatchedCount,
	getUnbatchedQueries,
	insertQuery,
} from "./queries";
// Schema types
export type { Batch, NewBatch, NewQueryLog, QueryLog } from "./schema";

// Utilities
export { initDatabase, withTransaction } from "./utils";
