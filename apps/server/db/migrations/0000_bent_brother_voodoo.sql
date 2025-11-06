CREATE TABLE `batches` (
	`id` text PRIMARY KEY NOT NULL,
	`start_seq` integer NOT NULL,
	`end_seq` integer NOT NULL,
	`merkle_root` text NOT NULL,
	`record_count` integer NOT NULL,
	`leaf_algo` text DEFAULT 'SHA-256' NOT NULL,
	`leaf_schema` text DEFAULT 'MSGPACK' NOT NULL,
	`tx_hash` text,
	`created_at` integer NOT NULL,
	`committed_at` integer
);
--> statement-breakpoint
CREATE TABLE `query_logs` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`query_id` text NOT NULL,
	`model_id` integer NOT NULL,
	`input_hash` text NOT NULL,
	`prediction` real NOT NULL,
	`timestamp` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`batch_id` text,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `query_logs_query_id_unique` ON `query_logs` (`query_id`);--> statement-breakpoint
CREATE INDEX `idx_batch_id` ON `query_logs` (`batch_id`);--> statement-breakpoint
CREATE INDEX `idx_model_id` ON `query_logs` (`model_id`);--> statement-breakpoint
CREATE INDEX `idx_timestamp` ON `query_logs` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_unbatched` ON `query_logs` (`seq`) WHERE "query_logs"."batch_id" IS NULL;