import type { QueryLogRecord } from "./types";

const DB_URL = new URL("../db.json", import.meta.url);
let cache: QueryLogRecord[] = [];

export async function initDB() {
	cache = await readDB();
}

export async function appendRecord(rec: QueryLogRecord) {
	cache.push(rec);
	await writeDB(cache);
}

export function getRecordCount(): number {
	return cache.length;
}

export async function getRecords(params?: {
	limit?: number;
	offset?: number;
}): Promise<QueryLogRecord[]> {
	if (cache.length === 0) cache = await readDB();
	const offset = Math.max(0, params?.offset ?? 0);
	const limit = Math.max(0, params?.limit ?? cache.length);
	return cache.slice(offset, offset + limit);
}

async function readDB(): Promise<QueryLogRecord[]> {
	try {
		const f = Bun.file(DB_URL);
		if (!(await f.exists())) return [];
		const json = await f.json();
		return Array.isArray(json) ? (json as QueryLogRecord[]) : [];
	} catch {
		return [];
	}
}

async function writeDB(data: QueryLogRecord[]): Promise<void> {
	await Bun.write(DB_URL, JSON.stringify(data, null, 2));
}
