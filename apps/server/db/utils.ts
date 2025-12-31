import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./client";

/**
 * Initialize database - run migrations
 */
export function initDatabase() {
	console.log(" Running database migrations...");

	const migrationsFolder =
		process.env.NODE_ENV === "production"
			? "./db/migrations" // Production
			: new URL("./migrations", import.meta.url).pathname; // Dev

	migrate(db, { migrationsFolder });

	console.log(" Database initialized");
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
