import { UltraHonkBackend } from "@aztec/bb.js";
import { type CompiledCircuit, Noir } from "@noir-lang/noir_js";
import {
	fairness_audit_circuit,
	type fairness_auditInputType,
} from "@zkfair/zk-circuits/codegen";
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
	features: number[];
	sensitiveAttr: number;
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
 * Domain-separated with version prefix, includes all mutable fields:
 * queryId, modelId, features, sensitiveAttr, inputHash, prediction, timestamp
 */
function encodeRecordLeaf(r: AuditRecord): Uint8Array {
	const tuple: unknown[] = [
		"ZKFAIR:RECORD:V1",
		r.queryId,
		r.modelId,
		r.features,
		r.sensitiveAttr,
		hexToBytes(r.inputHash),
		f32(r.prediction),
		r.timestamp,
	];
	return new TextEncoder().encode(JSON.stringify(tuple));
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
		if (!records.length) {
			throw new Error("Cannot build batch from empty records");
		}

		const leaves: string[] = [];
		const indexById = new Map<string, number>();

		for (const [i, rec] of records.entries()) {
			const encoded = encodeRecordLeaf(rec);
			const leaf = hashBytes(encoded);
			leaves.push(leaf.toLowerCase());
			indexById.set(rec.queryId, i);
		}

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
	async generateFairnessZKProof(
		root: Hex,
		sampleIndices: number[],
		records: AuditRecord[],
		merkleProofs: AuditProof[],
	): Promise<{
		zkProof: Hex;
		publicInputs: Hex[];
	}> {
		// process merkleProofs auditProof type to fit circuit input
		// & read thresholds off of .zkfair dir and model features data
		const input: fairness_auditInputType = {} as any;

		const noir = new Noir(fairness_audit_circuit as CompiledCircuit);
		const { witness } = await noir.execute(input);

		const backend = new UltraHonkBackend(fairness_audit_circuit.bytecode);
		const proofData = await backend.generateProof(witness);

		const proofHash = `0x${Array.from(proofData.proof)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("")}` as Hash;

		return {
			zkProof: proofHash,
			publicInputs: proofData.publicInputs as Hex[],
		};
	}

	/**
	 * Create proof for a query
	 */
	async createProof(
		records: AuditRecord[],
		queryId: string,
	): Promise<AuditProof> {
		if (records.length === 0) {
			throw new Error("No records provided");
		}

		const leaves: string[] = [];
		const indexById = new Map<string, number>();

		for (const [i, rec] of records.entries()) {
			const encoded = encodeRecordLeaf(rec);
			const leaf = hashBytes(encoded);
			leaves.push(leaf.toLowerCase());
			indexById.set(rec.queryId, i);
		}

		const index = indexById.get(queryId);

		if (index === undefined) {
			throw new Error(`Query ID "${queryId}" not found in records`);
		}

		const { root, proof } = await createMerkleProof(leaves, index);

		return { root, index, proof };
	}

	/**
	 * Verify a proof
	 */
	async verifyProof(record: AuditRecord, proof: AuditProof): Promise<boolean> {
		const encoded = encodeRecordLeaf(record);
		let current = hashBytes(encoded);

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

			current = hashBytes(combined);
		}

		const computedRoot = `0x${current}` as Hex;
		return computedRoot.toLowerCase() === proof.root.toLowerCase();
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
