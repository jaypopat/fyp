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
 */
export const queryLogs = sqliteTable(
	"query_logs",
	{
		// Auto-incrementing sequence number - prevents selective omission
		seq: integer("seq").primaryKey({ autoIncrement: true }),

		// Query identification
		queryId: text("query_id").notNull().unique(),

		// Model and inference data
		modelId: integer("model_id").notNull(),
		inputHash: text("input_hash").notNull(),
		prediction: real("prediction").notNull(),

		// Timestamps
		timestamp: integer("timestamp", { mode: "number" }).notNull(),
		createdAt: integer("created_at", { mode: "number" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),

		// Batch assignment (nullable until batched)
		batchId: text("batch_id").references(() => batches.id),
	},
	(table) => ({
		// Indexes for performance
		batchIdIdx: index("idx_batch_id").on(table.batchId),
		modelIdIdx: index("idx_model_id").on(table.modelId),
		timestampIdx: index("idx_timestamp").on(table.timestamp),
		// Partial index for unbatched queries (WHERE batch_id IS NULL)
		unbatchedIdx: index("idx_unbatched")
			.on(table.seq)
			.where(sql`${table.batchId} IS NULL`),
	}),
);

/**
 * Batches - Merkle tree batches committed on-chain
 */
export const batches = sqliteTable("batches", {
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

export type QueryLog = typeof queryLogs.$inferSelect;
export type NewQueryLog = typeof queryLogs.$inferInsert;
export type Batch = typeof batches.$inferSelect;
export type NewBatch = typeof batches.$inferInsert;
