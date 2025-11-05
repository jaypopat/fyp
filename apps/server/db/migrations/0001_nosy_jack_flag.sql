PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_query_logs` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`query_id` text NOT NULL,
	`model_id` text NOT NULL,
	`input_hash` text NOT NULL,
	`prediction` real NOT NULL,
	`timestamp` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`batch_id` text,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_query_logs`("seq", "query_id", "model_id", "input_hash", "prediction", "timestamp", "created_at", "batch_id") SELECT "seq", "query_id", "model_id", "input_hash", "prediction", "timestamp", "created_at", "batch_id" FROM `query_logs`;--> statement-breakpoint
DROP TABLE `query_logs`;--> statement-breakpoint
ALTER TABLE `__new_query_logs` RENAME TO `query_logs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `query_logs_query_id_unique` ON `query_logs` (`query_id`);--> statement-breakpoint
CREATE INDEX `idx_batch_id` ON `query_logs` (`batch_id`);--> statement-breakpoint
CREATE INDEX `idx_model_id` ON `query_logs` (`model_id`);--> statement-breakpoint
CREATE INDEX `idx_timestamp` ON `query_logs` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_unbatched` ON `query_logs` (`seq`) WHERE "query_logs"."batch_id" IS NULL;