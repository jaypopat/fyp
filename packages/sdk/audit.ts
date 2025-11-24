import { UltraHonkBackend } from "@aztec/bb.js";
import initACVM from "@noir-lang/acvm_js";
import { type CompiledCircuit, Noir } from "@noir-lang/noir_js";
import initNoirWasm from "@noir-lang/noirc_abi";
import {
	fairness_audit_circuit,
	type fairness_auditInputType,
} from "@zkfair/zk-circuits/codegen";
import type { Hash, Hex } from "viem";
import { getDefaultConfig } from "./config";
import type { ContractClient } from "./contract";
import { createMerkleProof, merkleRoot } from "./merkle";
import { hashBytes } from "./utils";

// Initialize WASM modules once (shared with proof.ts)
let wasmInitialized = false;
async function ensureWasmInitialized() {
	if (!wasmInitialized) {
		await initNoirWasm();
		await initACVM();
		wasmInitialized = true;
	}
}

/**
 * Canonical query record for audit trail
 * This is the minimal data needed to build Merkle proofs
 */
export type AuditRecord = {
	queryId: string;
	modelId: number;
	features: number[];
	sensitiveAttr: number;
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
	private readonly attestationUrl: string;

	constructor(private contracts: ContractClient) {
		// Use provided URL or default from config
		const config = getDefaultConfig();
		this.attestationUrl = config.attestationServiceUrl;
	}

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
		attestationHash: Hash;
		signature: Hex;
		passed: boolean;
	}> {
		// Initialize WASM modules before using Noir
		await ensureWasmInitialized();

		// process merkleProofs auditProof type to fit circuit input
		// & read thresholds off of .zkfair dir and model features data
		const input: fairness_auditInputType = {
			// TODO: populate with actual fairness audit inputs from parameters
		} as fairness_auditInputType;

		const noir = new Noir(fairness_audit_circuit as CompiledCircuit);
		const { witness } = await noir.execute(input);

		const backend = new UltraHonkBackend(fairness_audit_circuit.bytecode);
		const proofData = await backend.generateProof(witness);

		const proofHash = `0x${Array.from(proofData.proof)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("")}` as Hash;

		// Request attestation from service
		const attestationResponse = await fetch(
			`${this.attestationUrl}/attest/audit`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					proof: proofHash,
					publicInputs: proofData.publicInputs,
				}),
			},
		);

		if (!attestationResponse.ok) {
			throw new Error(
				`Attestation service error: ${attestationResponse.status} ${attestationResponse.statusText}`,
			);
		}

		const attestation = (await attestationResponse.json()) as {
			attestationHash: Hash;
			signature: Hex;
			passed: boolean;
		};

		return {
			zkProof: proofHash,
			publicInputs: proofData.publicInputs as Hex[],
			attestationHash: attestation.attestationHash,
			signature: attestation.signature,
			passed: attestation.passed,
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
	 * Submit audit proof attestation in response to an audit request
	 * @param auditId Audit ID
	 * @param attestationHash Hash of the attestation
	 * @param signature Signature from attestation service
	 * @param passed Whether the audit passed or failed
	 * @returns Transaction hash
	 */
	async submitAuditProof(
		auditId: bigint,
		attestationHash: Hash,
		signature: `0x${string}`,
		passed: boolean,
	): Promise<Hash> {
		return await this.contracts.submitAuditProof(
			auditId,
			attestationHash,
			signature,
			passed,
		);
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
