import { createMerkleProof, merkleRoot } from "../../../packages/sdk/merkle";
import { getRecords, getRecordCount } from "./db";
import { recordsToLeaves } from "./audit";

export type Hex = `0x${string}`;

export type BatchMeta = {
  id: string; // e.g., "0-99"
  startIndex: number; // inclusive
  endIndex: number; // inclusive
  count: number; // should equal (endIndex - startIndex + 1)
  root: Hex;
  leafAlgo: "SHA-256";
  leafSchema: "MSGPACK";
  createdAt: number; // ms
};

const BATCHES_URL = new URL("../batches.json", import.meta.url);
let batchesCache: BatchMeta[] = [];

async function readBatches(): Promise<BatchMeta[]> {
  try {
    const f = Bun.file(BATCHES_URL);
    if (!(await f.exists())) return [];
    const json = await f.json();
    return Array.isArray(json) ? (json as BatchMeta[]) : [];
  } catch {
    return [];
  }
}
async function writeBatches(data: BatchMeta[]): Promise<void> {
  await Bun.write(BATCHES_URL, JSON.stringify(data, null, 2));
}

export async function initBatches() {
  batchesCache = await readBatches();
}

export function listBatches(): BatchMeta[] {
  return batchesCache.slice();
}

export function getBatchById(id: string): BatchMeta | undefined {
  return batchesCache.find((b) => b.id === id);
}

export async function createBatchIfNeeded(batchSize: number): Promise<BatchMeta[] | undefined> {
  const count = getRecordCount();
  if (count < batchSize) return;
  // Number of complete batches that should exist now
  const shouldExist = Math.floor(count / batchSize);
  const have = batchesCache.length;
  if (have >= shouldExist) return; // nothing to do

  const created: BatchMeta[] = [];
  for (let b = have; b < shouldExist; b++) {
    const startIndex = b * batchSize;
    const endIndex = startIndex + batchSize - 1;
    const slice = await getRecords({ offset: startIndex, limit: batchSize });
    if (slice.length !== batchSize) break; // safety
    const { leaves } = await recordsToLeaves(slice);
    const root = await merkleRoot(leaves, "SHA-256");
    const meta: BatchMeta = {
      id: `${startIndex}-${endIndex}`,
      startIndex,
      endIndex,
      count: batchSize,
      root,
      leafAlgo: "SHA-256",
      leafSchema: "MSGPACK",
      createdAt: Date.now(),
    };
    batchesCache.push(meta);
    created.push(meta);
  }
  if (created.length) await writeBatches(batchesCache);
  return created;
}

export async function computeProofForQueryInBatch(params: {
  batchId: string;
  queryId: string;
}): Promise<{
  root: Hex;
  index: number;
  proof: { sibling: string; position: "left" | "right" }[];
}> {
  const batch = getBatchById(params.batchId);
  if (!batch) throw new Error("Batch not found");
  const slice = await getRecords({ offset: batch.startIndex, limit: batch.count });
  const index = slice.findIndex((r) => r.queryId === params.queryId);
  if (index < 0) throw new Error("queryId not found in batch");
  const { leaves } = await recordsToLeaves(slice);
  const { proof } = await createMerkleProof(leaves, index, "SHA-256");
  return { root: batch.root, index, proof };
}
