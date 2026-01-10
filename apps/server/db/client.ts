import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

const DB_PATH =
	process.env.DATABASE_URL ||
	(process.env.NODE_ENV === "production"
		? "/data/zkfair.db"
		: new URL("../zkfair.db", import.meta.url).pathname);

const sqlite = new Database(DB_PATH, { create: true });

// Create Drizzle instance with all tables (protocol + provider)
export const db = drizzle(sqlite, { schema });
