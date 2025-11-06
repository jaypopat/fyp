/**
 * Database Client - Drizzle ORM
 *
 * Production-ready database with proper connection handling
 */

import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

// Database file path
const DB_PATH = new URL("../zkfair.db", import.meta.url).pathname;

// Create SQLite connection
const sqlite = new Database(DB_PATH, { create: true });

// Create Drizzle instance with schema
export const db = drizzle(sqlite, { schema });
