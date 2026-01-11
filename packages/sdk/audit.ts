import { UltraHonkBackend } from "@aztec/bb.js";
import { type CompiledCircuit, Noir } from "@noir-lang/noir_js";
import {
	fairness_audit_circuit,
	type fairness_auditInputType,
} from "@zkfair/zk-circuits/codegen";
import { and, asc, between, sql } from "drizzle-orm";
import { poseidon2, poseidon8 } from "poseidon-lite";
import type { Hash, Hex } from "viem";
import { parseFairnessThresholdFile, parsePathsFile } from "./artifacts";
import { getDefaultConfig } from "./config";
import type { ContractClient } from "./contract";
import type { AuditRequestedEvent } from "./events";
import { createMerkleProof, merkleRoot } from "./merkle";
import { type DrizzleDB, type QueryLog, zkfairQueryLogs } from "./schema";
import { getArtifactDir, weightsToFields } from "./utils";

/**
 * Canonical query record for audit trail
 */
export type AuditRecord = {
	seqNum: number;
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
	id: string;
	startIndex: number;
	endIndex: number;
	count: number;
	root: Hex;
	createdAt: number;
};

/**
 * Merkle proof for a query in a batch
 */
export type AuditProof = {
	root: Hex;
	index: number;
	proof: { sibling: string; position: "left" | "right" }[];
};

/**
 * Hash a record leaf exactly as the circuit does:
 * leaf_data = [features[0..13], prediction, sensitiveAttr] (16 fields)
 * hash1 = poseidon8(leaf_data[0..7])
 * hash2 = poseidon8(leaf_data[8..15])
 * leaf_hash = poseidon2([hash1, hash2])
 *
 * @returns 64-character hex string (no 0x prefix)
 */
export function hashRecordLeaf(r: AuditRecord): string {
	// Build leaf_data array matching circuit: [features[0..13], prediction, sensitiveAttr]
	const leafData: bigint[] = [];

	// Add 14 features (pad with 0 if needed)
	for (let i = 0; i < 14; i++) {
		leafData.push(BigInt(r.features[i] ?? 0));
	}

	// Add binary prediction (circuit expects 0 or 1)
	leafData.push(r.prediction >= 0.5 ? 1n : 0n);

	// Add sensitive attribute
	leafData.push(BigInt(r.sensitiveAttr));

	// Hash exactly as circuit does
	const hash1 = poseidon8(leafData.slice(0, 8));
	const hash2 = poseidon8(leafData.slice(8, 16));
	const leafHash = poseidon2([hash1, hash2]);

	// Convert to 64-char hex (no 0x prefix)
	return leafHash.toString(16).padStart(64, "0");
}

/**
 * AuditAPI - High-level audit operations with contract integration
 * Provides both local computation and on-chain submission capabilities
 * Uses standardized Poseidon hash and JSON encoding
 */
export class AuditAPI {
	private readonly attestationUrl: string;

	constructor(private contracts: ContractClient) {
		const config = getDefaultConfig();
		this.attestationUrl = config.attestationServiceUrl;
	}

	/**
	 * Build a batch from records
	 * Uses Poseidon hash matching circuit's leaf encoding
	 */
	async buildBatch(records: AuditRecord[]): Promise<{
		root: Hex;
		count: number;
		indices: { seqNum: number; index: number }[];
	}> {
		if (!records.length) {
			throw new Error("Cannot build batch from empty records");
		}

		const leaves: string[] = [];
		const indexBySeq = new Map<number, number>();

		for (const [i, rec] of records.entries()) {
			const leaf = hashRecordLeaf(rec);
			leaves.push(leaf.toLowerCase());
			indexBySeq.set(rec.seqNum, i);
		}

		const root = await merkleRoot(leaves);

		const indices = records.map((r, i) => ({
			seqNum: r.seqNum,
			index: indexBySeq.get(r.seqNum) ?? i,
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
		weightsHash: Hash,
		auditId: bigint,
	): Promise<{
		zkProof: Hex;
		publicInputs: Hex[];
		attestationHash: Hash;
		signature: Hex;
		passed: boolean;
	}> {
		// Circuit constants (must match fairness_audit/src/main.nr)
		const NUM_FEATURES = 14;
		const SAMPLE_SIZE = 10;
		const TREE_DEPTH = 7;

		// 1. Load model artifacts from ~/.zkfair/<weightsHash>/
		const artifactDir = getArtifactDir(weightsHash);

		const pathsFile = Bun.file(`${artifactDir}/paths.json`);
		if (!(await pathsFile.exists())) {
			throw new Error(`Artifact directory not found: ${artifactDir}`);
		}
		const paths = parsePathsFile(await pathsFile.json());

		// Load model weights
		const weightsBuffer = await Bun.file(paths.weights).arrayBuffer();
		const modelWeightsFields = await weightsToFields(
			new Float32Array(weightsBuffer),
		);

		// Load fairness thresholds
		const fairnessConfig = parseFairnessThresholdFile(
			await Bun.file(paths.fairnessThreshold).json(),
		);

		// 2. Get sampled records based on sampleIndices
		const sampledRecords = sampleIndices.map((idx) => {
			const record = records[idx];
			if (!record) {
				throw new Error(
					`Sample index ${idx} out of bounds (records: ${records.length})`,
				);
			}
			return record;
		});

		// 3. Prepare circuit inputs from sampled records (flatmapped)
		const sampleFeatures = sampledRecords.flatMap((r) => {
			const features = [...r.features];
			while (features.length < NUM_FEATURES) features.push(0);
			return features.slice(0, NUM_FEATURES).map(String);
		});
		const samplePredictions = sampledRecords.map((r) =>
			r.prediction >= 0.5 ? "1" : "0",
		);
		const sampleSensitiveAttrs = sampledRecords.map((r) =>
			String(r.sensitiveAttr),
		);

		// 4. Build sample count and validity mask
		const actualSampleCount = sampleIndices.length;
		const sampleValid: boolean[] = [];
		for (let i = 0; i < SAMPLE_SIZE; i++) {
			sampleValid.push(i < actualSampleCount);
		}

		// 5. Pad samples/predictions/attrs to SAMPLE_SIZE (but circuit will skip invalid ones)
		while (sampleFeatures.length < NUM_FEATURES * SAMPLE_SIZE) {
			sampleFeatures.push("0");
		}
		while (samplePredictions.length < SAMPLE_SIZE) {
			samplePredictions.push("0");
		}
		while (sampleSensitiveAttrs.length < SAMPLE_SIZE) {
			sampleSensitiveAttrs.push("0");
		}

		// 6. Prepare Merkle proofs for circuit (pad to SAMPLE_SIZE)
		const paddedProofs = [...merkleProofs];
		while (paddedProofs.length < SAMPLE_SIZE) {
			paddedProofs.push({
				root: root,
				index: 0,
				proof: new Array(TREE_DEPTH).fill({
					sibling: "0x0",
					position: "left" as const,
				}),
			});
		}

		const circuitMerkleProofs = paddedProofs.map((p) => {
			const steps = [...p.proof];
			while (steps.length < TREE_DEPTH)
				steps.push({ sibling: "0x0", position: "left" as const });
			return steps.slice(0, TREE_DEPTH).map((s) => {
				const hex = s.sibling.startsWith("0x") ? s.sibling.slice(2) : s.sibling;
				return BigInt(`0x${hex || "0"}`).toString();
			});
		});

		const circuitPathIndices = paddedProofs.map((p) => {
			const steps = [...p.proof];
			while (steps.length < TREE_DEPTH)
				steps.push({ sibling: "0x0", position: "left" as const });
			return steps.slice(0, TREE_DEPTH).map((s) => s.position === "right");
		});

		// 7. Build circuit input with sample count and validity mask
		const input: fairness_auditInputType = {
			_model_weights: modelWeightsFields.map(String),
			_sample_count: String(actualSampleCount),
			_sample_valid: sampleValid,
			_sample_features: sampleFeatures,
			_sample_predictions: samplePredictions,
			_sample_sensitive_attrs: sampleSensitiveAttrs,
			_merkle_proofs: circuitMerkleProofs,
			_merkle_path_indices: circuitPathIndices,
			_threshold_group_a: String(fairnessConfig.thresholds.group_a),
			_threshold_group_b: String(fairnessConfig.thresholds.group_b),
			_batch_merkle_root: root.startsWith("0x")
				? BigInt(root).toString()
				: BigInt(`0x${root}`).toString(),
			_weights_hash: weightsHash.startsWith("0x")
				? BigInt(weightsHash).toString()
				: BigInt(`0x${weightsHash}`).toString(),
			_fairness_threshold_epsilon: Math.ceil(
				fairnessConfig.targetDisparity * 100,
			).toString(),
		};

		console.log("Generating fairness audit ZK proof...");
		console.log(
			`  Samples: ${actualSampleCount} (valid) / ${SAMPLE_SIZE} (max)`,
		);
		console.log(`  Batch root: ${root}`);

		// 8. Execute circuit and generate proof
		const noir = new Noir(fairness_audit_circuit as CompiledCircuit);

		let zkProof: Hex;
		let publicInputs: `0x${string}`[];
		let circuitPassed = true;

		try {
			const { witness } = await noir.execute(input);
			const backend = new UltraHonkBackend(fairness_audit_circuit.bytecode);
			const proofData = await backend.generateProof(witness);

			zkProof = `0x${Array.from(proofData.proof)
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("")}` as Hex;
			publicInputs = proofData.publicInputs as `0x${string}`[];
		} catch (error) {
			// Circuit constraint failed - this means the audit failed (fairness violation detected)
			console.error(
				"Circuit execution failed (fairness violation detected):",
				error,
			);
			circuitPassed = false;
			// Use dummy proof for failed audits - attestation service will sign based on passed=false
			zkProof = "0x00" as Hex;
			publicInputs = [];
		}

		// 9. Request attestation from service
		// Note: Don't send circuitPassed - attestation service must verify proof itself
		const attestationResponse = await fetch(
			`${this.attestationUrl}/attest/audit`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					proof: zkProof,
					publicInputs: Array.from(publicInputs),
					auditId: Number(auditId),
				}),
			},
		);

		if (!attestationResponse.ok) {
			const error = await attestationResponse.json();
			throw new Error(
				`Attestation service error: ${(error as { error?: string }).error || attestationResponse.statusText}`,
			);
		}

		const attestation = (await attestationResponse.json()) as {
			attestationHash: Hash;
			signature: Hex;
			passed: boolean;
		};

		return {
			zkProof,
			publicInputs: circuitPassed ? (publicInputs as unknown as Hex[]) : [],
			attestationHash: attestation.attestationHash,
			signature: attestation.signature,
			passed: attestation.passed,
		};
	}

	/**
	 * Create proof for a query by sequence number
	 */
	async createProof(
		records: AuditRecord[],
		seqNum: number,
	): Promise<AuditProof> {
		if (records.length === 0) {
			throw new Error("No records provided");
		}

		const leaves: string[] = [];
		const indexBySeq = new Map<number, number>();

		for (const [i, rec] of records.entries()) {
			const leaf = hashRecordLeaf(rec);
			leaves.push(leaf.toLowerCase());
			indexBySeq.set(rec.seqNum, i);
		}

		const index = indexBySeq.get(seqNum);

		if (index === undefined) {
			throw new Error(`Sequence #${seqNum} not found in records`);
		}

		const { root, proof } = await createMerkleProof(leaves, index);

		return { root, index, proof };
	}

	async handleAuditRequest(
		event: AuditRequestedEvent,
		db: DrizzleDB,
	): Promise<{
		txHash: Hash;
		passed: boolean;
	}> {
		console.log("Handling audit request:", {
			auditId: event.auditId.toString(),
			batchId: event.batchId.toString(),
		});

		// Check if we've already responded to this audit
		const audit = await this.contracts.getAudit(event.auditId);
		if (audit.responded) {
			console.log(`Audit ${event.auditId} already has a response, skipping.`);
			return { txHash: "0x" as Hash, passed: audit.status === 1 }; // AuditStatus.PASSED = 1
		}

		// 1. Get batch info from contract
		const batch = await this.contracts.getBatch(event.batchId);
		const startSeq = Number(batch.seqNumStart);
		const endSeq = Number(batch.seqNumEnd);
		const modelId = batch.modelId;

		console.log(
			`Batch covers seqNum ${startSeq} to ${endSeq}, modelId: ${modelId}`,
		);

		// 2. Get model's weightsHash (needed to find artifacts)
		const model = await this.contracts.getModel(modelId);
		const weightsHash = model.weightsHash as Hash;
		console.log(`Model weightsHash: ${weightsHash}`);

		// 3. Load records from storage by sequence range

		const records = await db
			.select()
			.from(zkfairQueryLogs)
			.where(between(zkfairQueryLogs.seq, startSeq, endSeq))
			.orderBy(asc(zkfairQueryLogs.seq));

		if (records.length === 0) {
			throw new Error(`No records found for seq range ${startSeq}-${endSeq}`);
		}

		console.log(`Loaded ${records.length} records from storage`);

		// 4. Convert to AuditRecord format
		const auditRecords: AuditRecord[] = records.map((r: QueryLog) => ({
			seqNum: r.seq,
			modelId: r.modelId,
			features: r.features,
			sensitiveAttr: r.sensitiveAttr,
			prediction: r.prediction,
			timestamp: r.timestamp,
		}));

		// 5. Build Merkle tree for the batch
		const { root } = await this.buildBatch(auditRecords);
		console.log(`Built Merkle tree with root ${root}`);

		// 6. Convert sample indices and generate merkle proofs
		const sampleIndices = event.sampleIndices.map((idx: bigint) => Number(idx));
		const merkleProofs = await Promise.all(
			sampleIndices.map(async (index: number) => {
				const record = auditRecords[index];
				if (!record) {
					throw new Error(`No record found at index ${index}`);
				}
				return this.createProof(auditRecords, record.seqNum);
			}),
		);
		console.log(`Generated ${merkleProofs.length} Merkle proofs`);

		// 7. Generate ZK proof and get attestation
		console.log("Generating ZK proof and requesting attestation...");
		const { attestationHash, signature, passed } =
			await this.generateFairnessZKProof(
				root,
				sampleIndices,
				auditRecords,
				merkleProofs,
				weightsHash,
				event.auditId,
			);

		console.log(`Attestation received: passed=${passed}`);

		// 8. Submit signed attestation to contract
		console.log("Submitting attestation to contract...");
		const txHash = await this.submitAuditProof(
			event.auditId,
			attestationHash,
			signature,
			passed,
		);

		console.log(`Audit response submitted: ${txHash}`);
		return { txHash, passed };
	}

	/**
	 * Commit a batch of queries on-chain
	 * @param modelId Model ID
	 * @param merkleRoot Merkle root of the batch
	 * @param queryCount Number of queries in the batch
	 * @param startSeq Batch start sequence number
	 * @param endSeq Batch end sequence number
	 * @returns Transaction hash
	 */
	async commitBatch(
		modelId: bigint,
		merkleRoot: Hash,
		queryCount: bigint,
		startSeq: bigint,
		endSeq: bigint,
	): Promise<Hash> {
		return await this.contracts.commitBatch(
			modelId,
			merkleRoot,
			queryCount,
			startSeq,
			endSeq,
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
