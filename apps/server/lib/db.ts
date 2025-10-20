export type QueryLogRecord = {
	queryId: string;
	modelId: number;
	input: number[];
	prediction: number;
	timestamp: number;
};

const DB_URL = new URL("../db.json", import.meta.url);
let cache: QueryLogRecord[] = [];

export async function initDB() {
	cache = await readDB();
}

export async function appendRecord(rec: QueryLogRecord) {
	cache.push(rec);
	await writeDB(cache);
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
