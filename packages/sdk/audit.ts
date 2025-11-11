import type { Hash, Hex } from "viem";
import type { ContractClient } from "./contract";
import { createMerkleProof, merkleRoot } from "./merkle";
import { hashBytes, hexToBytes } from "./utils";

/**
 * Canonical query record for audit trail
 * This is the minimal data needed to build Merkle proofs
 */
export type AuditRecord = {
	queryId: string;
	modelId: number;
	inputHash: Hex;
	prediction: number;
	timestamp: number;
};

/**
 * Batch metadata for persistent audit batches
 */
export type AuditBatch = {
	id: string; // e.g., "0-99"
	startIndex: number; // inclusive
	endIndex: number; // inclusive
	count: number; // should equal (endIndex - startIndex + 1)
	root: Hex;
	createdAt: number; // ms timestamp
};

/**
 * Merkle proof for a query in a batch
 */
export type AuditProof = {
	root: Hex;
	index: number;
	proof: { sibling: string; position: "left" | "right" }[];
};

function f32(n: number): number {
	const arr = new Float32Array(1);
	arr[0] = n;
	return arr[0];
}

/**
 * Encode a query record as a canonical leaf for Merkle tree
 * Domain-separated with version prefix
 * Uses JSON encoding for standardization
 */
function encodeRecordLeaf(r: AuditRecord): Uint8Array {
	const tuple: unknown[] = [
		"ZKFAIR:RECORD:V1",
		r.queryId,
		r.modelId,
		hexToBytes(r.inputHash),
		f32(r.prediction),
		r.timestamp,
	];
	return new TextEncoder().encode(JSON.stringify(tuple));
}

/**
 * Convert audit records to Merkle tree leaves
 * Returns leaves as plain 64-hex strings (no 0x prefix) and index mapping
 * Uses Poseidon hash for ZK-friendliness
 */
export async function recordsToLeaves(
	records: AuditRecord[],
): Promise<{ leaves: string[]; indexById: Map<string, number> }> {
	const leaves: string[] = [];
	const indexById = new Map<string, number>();

	for (const [i, rec] of records.entries()) {
		const encoded = encodeRecordLeaf(rec);
		const leaf = await hashBytes(encoded);
		leaves.push(leaf.toLowerCase());
		indexById.set(rec.queryId, i);
	}

	return { leaves, indexById };
}

/**
 * Compute Merkle root and metadata for a batch of query records
 * This is storage-agnostic - you provide the records
 * Uses Poseidon hash and JSON encoding (standardized)
 */
export async function computeAuditBatch(records: AuditRecord[]): Promise<{
	root: Hex;
	count: number;
	indices: { queryId: string; index: number }[];
}> {
	if (!records.length) {
		throw new Error("Cannot build batch from empty records");
	}

	const { leaves, indexById } = await recordsToLeaves(records);
	const root = await merkleRoot(leaves);

	const indices = records.map((r, i) => ({
		queryId: r.queryId,
		index: indexById.get(r.queryId) ?? i,
	}));

	return {
		root,
		count: records.length,
		indices,
	};
}

/**
 * Create a Merkle membership proof for a specific query in a batch
 * Returns the root and proof path
 * Uses Poseidon hash (standardized)
 */
export async function createAuditProof(
	records: AuditRecord[],
	queryId: string,
): Promise<AuditProof> {
	if (records.length === 0) {
		throw new Error("No records provided");
	}

	const { leaves, indexById } = await recordsToLeaves(records);
	const index = indexById.get(queryId);

	if (index === undefined) {
		throw new Error(`Query ID "${queryId}" not found in records`);
	}

	const { root, proof } = await createMerkleProof(leaves, index);

	return { root, index, proof };
}

/**
 * Verify an audit proof for a query record
 * Uses Poseidon hash (standardized)
 */
export async function verifyAuditProof(
	record: AuditRecord,
	proof: AuditProof,
): Promise<boolean> {
	const encoded = encodeRecordLeaf(record);
	let current = await hashBytes(encoded);

	for (const { sibling, position } of proof.proof) {
		const left = position === "left" ? sibling : current;
		const right = position === "left" ? current : sibling;

		const leftBytes = hexToBytes(`0x${left}` as Hex);
		const rightBytes = hexToBytes(`0x${right}` as Hex);
		const NODE_PREFIX = new Uint8Array([0x01]);
		const combined = new Uint8Array(1 + leftBytes.length + rightBytes.length);
		combined.set(NODE_PREFIX, 0);
		combined.set(leftBytes, 1);
		combined.set(rightBytes, 1 + leftBytes.length);

		current = await hashBytes(combined);
	}

	const computedRoot = `0x${current}` as Hex;
	return computedRoot.toLowerCase() === proof.root.toLowerCase();
}

/**
 * AuditAPI - High-level audit operations with contract integration
 * Provides both local computation and on-chain submission capabilities
 * Uses standardized Poseidon hash and JSON encoding
 */
export class AuditAPI {
	constructor(private contracts: ContractClient) {}

	/**
	 * Build a batch from records
	 * Uses standardized Poseidon hash and JSON encoding
	 */
	async buildBatch(records: AuditRecord[]): Promise<{
		root: Hex;
		count: number;
		indices: { queryId: string; index: number }[];
	}> {
		return computeAuditBatch(records);
	}

	/**
	 * Create proof for a query
	 */
	async createProof(
		records: AuditRecord[],
		queryId: string,
	): Promise<AuditProof> {
		return createAuditProof(records, queryId);
	}

	/**
	 * Verify a proof
	 */
	async verifyProof(record: AuditRecord, proof: AuditProof): Promise<boolean> {
		return verifyAuditProof(record, proof);
	}

	// ============================================
	// CONTRACT INTERACTIONS
	// ============================================

	/**
	 * Commit a batch of queries on-chain
	 * @param modelId Model ID
	 * @param merkleRoot Merkle root of the batch
	 * @param queryCount Number of queries in the batch
	 * @param startTime Batch start timestamp (Unix ms)
	 * @param endTime Batch end timestamp (Unix ms)
	 * @returns Transaction hash
	 */
	async commitBatch(
		modelId: bigint,
		merkleRoot: Hash,
		queryCount: bigint,
		startTime: bigint,
		endTime: bigint,
	): Promise<Hash> {
		return await this.contracts.commitBatch(
			modelId,
			merkleRoot,
			queryCount,
			startTime,
			endTime,
		);
	}

	/**
	 * Request an audit on a committed batch
	 * @param batchId Batch ID to audit
	 * @returns Transaction hash
	 */
	async requestAudit(batchId: bigint): Promise<Hash> {
		return await this.contracts.requestAudit(batchId);
	}

	/**
	 * Submit audit proof in response to an audit request
	 * @param auditId Audit ID
	 * @param proof ZK proof bytes
	 * @param publicInputs Public inputs for verification
	 * @returns Transaction hash
	 */
	async submitAuditProof(
		auditId: bigint,
		proof: Hash,
		publicInputs: Hash[],
	): Promise<Hash> {
		return await this.contracts.submitAuditProof(auditId, proof, publicInputs);
	}

	/**
	 * Slash provider for expired audit (permissionless)
	 * @param auditId Audit ID that expired
	 * @returns Transaction hash
	 */
	async slashExpiredAudit(auditId: bigint): Promise<Hash> {
		return await this.contracts.slashExpiredAudit(auditId);
	}
}
