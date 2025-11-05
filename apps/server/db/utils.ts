/**
 * Database Utilities - Transactions and initialization
 */

import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./client";

/**
 * Initialize database - run migrations
 */
export function initDatabase() {
	console.log("🔄 Running database migrations...");

	// Run migrations from ./db/migrations
	migrate(db, { migrationsFolder: "./db/migrations" });

	console.log("✅ Database initialized");
}

/**
 * Execute function within a transaction
 * Automatically handles commit/rollback
 */
export async function withTransaction<T>(fn: () => Promise<T> | T): Promise<T> {
	return await db.transaction(async () => {
		return await fn();
	});
}
