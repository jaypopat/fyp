import { encode } from "@msgpack/msgpack";
// Import merkle helpers directly from the SDK package source (monorepo)
import { createMerkleProof, merkleRoot } from "@zkfair/sdk/merkle";
import { getRecords, type QueryLogRecord } from "./db";

export type Hex = `0x${string}`;

type hashAlgo = "SHA-256"; // current default; keep in sync with SDK hashAlgos
const LEAF_HASH_ALGO: hashAlgo = "SHA-256";
const LEAF_SCHEMA = "MSGPACK" as const;

function bytesToPlainHex(bytes: Uint8Array): string {
    return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: Hex): Uint8Array {
    const h = hex.startsWith("0x") ? hex.slice(2) : hex;
    const out = new Uint8Array(h.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(h.slice(i * 2, i * 2 + 2), 16);
    return out;
}

function f32(n: number): number {
    const arr = new Float32Array(1);
    arr[0] = n;
    return arr[0];
}

// Canonical leaf encoding for a query record (without symmetric MAC or provider signature)
function encodeRecordLeafTuple(r: QueryLogRecord): Uint8Array {
    const tuple: unknown[] = [
        "ZKFAIR:RECORD:V1",
        r.queryId,
        r.modelId,
        hexToBytes(r.inputHash),
        f32(r.prediction),
        r.timestamp,
    ];
    return encode(tuple);
}

export async function recordsToLeaves(
    records: QueryLogRecord[],
): Promise<{ leaves: string[]; indexById: Map<string, number> }> {
    const leaves: string[] = [];
    const indexById = new Map<string, number>();
    for (const [i, rec] of records.entries()) {
        const enc = encodeRecordLeafTuple(rec);
        const hashBytes = Bun.sha(enc) as Uint8Array; // SHA-256
        const leaf = bytesToPlainHex(hashBytes).toLowerCase();
        // merkle.ts expects plain 64-hex string (no 0x)
        leaves.push(leaf);
        indexById.set(rec.queryId, i);
    }
    return { leaves, indexById };
}

export async function computeBatch(params?: {
    modelId?: number;
    start?: number;
    end?: number;
}): Promise<{
    root: Hex;
    count: number;
    leafAlgo: hashAlgo;
    leafSchema: typeof LEAF_SCHEMA;
    indices: { queryId: string; index: number }[];
}> {
    const records = await getRecords({ modelId: params?.modelId, start: params?.start, end: params?.end });
    if (records.length === 0) {
        throw new Error("No records for batch window");
    }
    const { leaves, indexById } = await recordsToLeaves(records);
    const root = await merkleRoot(leaves, LEAF_HASH_ALGO);
    const indices = records.map((r, i) => ({
        queryId: r.queryId,
        index: indexById.get(r.queryId) ?? i,
    }));
    return { root, count: leaves.length, leafAlgo: LEAF_HASH_ALGO, leafSchema: LEAF_SCHEMA, indices };
}

export async function computeProofForQuery(params: {
    queryId: string;
    modelId?: number;
    start?: number;
    end?: number;
}): Promise<{
    root: Hex;
    index: number;
    proof: { sibling: string; position: "left" | "right" }[];
}> {
    const records = await getRecords({ modelId: params.modelId, start: params.start, end: params.end });
    if (records.length === 0) throw new Error("No records for proof window");
    const { leaves, indexById } = await recordsToLeaves(records);
    const index = indexById.get(params.queryId);
    if (index === undefined) throw new Error("queryId not found in window");
    const { root, proof } = await createMerkleProof(leaves, index, LEAF_HASH_ALGO);
    return { root, index, proof };
}
