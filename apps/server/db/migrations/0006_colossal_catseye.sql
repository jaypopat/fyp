CREATE TABLE `zkfair_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`start_seq` integer NOT NULL,
	`end_seq` integer NOT NULL,
	`merkle_root` text NOT NULL,
	`record_count` integer NOT NULL,
	`tx_hash` text,
	`created_at` integer NOT NULL,
	`committed_at` integer
);
--> statement-breakpoint
CREATE TABLE `zkfair_query_logs` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model_id` integer NOT NULL,
	`features` text NOT NULL,
	`sensitive_attr` integer NOT NULL,
	`prediction` real NOT NULL,
	`timestamp` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`batch_id` text,
	FOREIGN KEY (`batch_id`) REFERENCES `zkfair_batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `zkfair_idx_batch_id` ON `zkfair_query_logs` (`batch_id`);--> statement-breakpoint
CREATE INDEX `zkfair_idx_model_id` ON `zkfair_query_logs` (`model_id`);--> statement-breakpoint
CREATE INDEX `zkfair_idx_timestamp` ON `zkfair_query_logs` (`timestamp`);--> statement-breakpoint
CREATE INDEX `zkfair_idx_unbatched` ON `zkfair_query_logs` (`seq`) WHERE "zkfair_query_logs"."batch_id" is null;