import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

// Database file path - use persistent volume in production
const DB_PATH =
	process.env.DATABASE_URL ||
	(process.env.NODE_ENV === "production"
		? "/app/data/zkfair.db" // Persistent Fly volume
		: new URL("../zkfair.db", import.meta.url).pathname); // Local dev

// Create SQLite connection
const sqlite = new Database(DB_PATH, { create: true });

// Create Drizzle instance with schema
export const db = drizzle(sqlite, { schema });
