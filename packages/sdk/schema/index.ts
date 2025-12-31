import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

/**
 * Drizzle database instance type for ZKFair SDK
 */
export type DrizzleDB = BunSQLiteDatabase<any>;

export {
	type Batch,
	type NewBatch,
	type NewQueryLog,
	type QueryLog,
	zkfairBatches,
	zkfairQueryLogs,
	zkfairSchema,
} from "./tables";
