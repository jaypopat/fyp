import { sql } from "drizzle-orm";
import {
	index,
	integer,
	real,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

/**
 * Query Logs - Every inference query with sequential numbering
 *
 * This table stores all inference queries made to the model provider.
 * The sequential numbering prevents selective omission attacks.
 */
export const zkfairQueryLogs = sqliteTable(
	"zkfair_query_logs",
	{
		// Auto-incrementing sequence number - prevents selective omission
		seq: integer("seq").primaryKey({ autoIncrement: true }),

		// Model and inference data
		modelId: integer("model_id").notNull(),
		features: text("features", { mode: "json" }).notNull().$type<number[]>(),
		sensitiveAttr: integer("sensitive_attr").notNull(),
		prediction: real("prediction").notNull(),

		// Timestamps
		timestamp: integer("timestamp", { mode: "number" }).notNull(),
		createdAt: integer("created_at", { mode: "number" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),

		// Batch assignment (nullable until batched)
		batchId: text("batch_id").references(() => zkfairBatches.id),
	},
	(table) => ({
		batchIdIdx: index("zkfair_idx_batch_id").on(table.batchId),
		modelIdIdx: index("zkfair_idx_model_id").on(table.modelId),
		timestampIdx: index("zkfair_idx_timestamp").on(table.timestamp),
		unbatchedIdx: index("zkfair_idx_unbatched")
			.on(table.seq)
			.where(sql`${table.batchId} IS NULL`),
	}),
);

/**
 * Batches - Merkle tree batches committed on-chain
 *
 * This table tracks batches of queries that have been committed
 * to the blockchain for audit verification.
 */
export const zkfairBatches = sqliteTable("zkfair_batches", {
	// Batch ID format: "startSeq-endSeq"
	id: text("id").primaryKey(),

	// Sequence range
	startSeq: integer("start_seq").notNull(),
	endSeq: integer("end_seq").notNull(),

	// Merkle tree data
	merkleRoot: text("merkle_root").notNull(),
	recordCount: integer("record_count").notNull(),

	// Blockchain tracking
	txHash: text("tx_hash"),

	// Timestamps
	createdAt: integer("created_at", { mode: "number" }).notNull(),
	committedAt: integer("committed_at", { mode: "number" }),
});

/**
 * Schema object for use with drizzle()
 */
export const zkfairSchema = {
	zkfairQueryLogs,
	zkfairBatches,
};

// Type inference from schema
export type QueryLog = typeof zkfairQueryLogs.$inferSelect;
export type NewQueryLog = typeof zkfairQueryLogs.$inferInsert;
export type Batch = typeof zkfairBatches.$inferSelect;
export type NewBatch = typeof zkfairBatches.$inferInsert;
