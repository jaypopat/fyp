ALTER TABLE `query_logs` ADD `features` text NOT NULL;--> statement-breakpoint
ALTER TABLE `query_logs` ADD `sensitive_attr` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `query_logs` DROP COLUMN `input_hash`;