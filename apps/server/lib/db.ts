export type QueryLogRecord = {
  queryId: string;
  modelId: number;
  input: number[];
  prediction: number;
  timestamp: number;
  inputHash: `0x${string}`; // canonical hash of input encoding used in transcripts
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

export function getRecordCount(): number {
  return cache.length;
}

export async function getAllRecords(): Promise<QueryLogRecord[]> {
  // Ensure cache is initialized if initDB() wasn't called yet
  if (cache.length === 0) cache = await readDB();
  return cache.slice();
}

export async function getRecords(params?: {
  modelId?: number;
  start?: number; // inclusive Unix ms
  end?: number; // inclusive Unix ms
  limit?: number;
  offset?: number;
}): Promise<QueryLogRecord[]> {
  if (cache.length === 0) cache = await readDB();
  let out = cache;
  if (params?.modelId !== undefined) {
    out = out.filter((r) => r.modelId === params.modelId);
  }
  if (params?.start !== undefined) {
    const start = params.start;
    out = out.filter((r) => r.timestamp >= start);
  }
  if (params?.end !== undefined) {
    const end = params.end;
    out = out.filter((r) => r.timestamp <= end);
  }
  const offset = Math.max(0, params?.offset ?? 0);
  const limit = Math.max(0, params?.limit ?? out.length);
  return out.slice(offset, offset + limit);
}

export async function getRecordById(
  queryId: string,
): Promise<QueryLogRecord | undefined> {
  if (cache.length === 0) cache = await readDB();
  return cache.find((r) => r.queryId === queryId);
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
// Deprecated draft function removed; use getRecords()/getAllRecords()/getRecordById instead.
