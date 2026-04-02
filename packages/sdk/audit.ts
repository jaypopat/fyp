import { UltraHonkBackend } from "@aztec/bb.js";
import { type CompiledCircuit, Noir } from "@noir-lang/noir_js";
import {
	fairness_audit_circuit,
	type fairness_auditInputType,
} from "@zkfair/zk-circuits/codegen";
import { asc, between } from "drizzle-orm";
import type { Hash, Hex } from "viem";
import { z } from "zod";
import {
	HashSchema,
	parseFairnessThresholdFile,
	parsePathsFile,
} from "./artifacts";
import { getDefaultConfig } from "./config";
import type { ContractClient } from "./contract";
import type { AuditRequestedEvent } from "./events";
import { type AuditRecord, bytesToHash, hashRecordLeaf } from "./hash";
import { createMerkleProof, merkleRoot } from "./merkle";
import { type DrizzleDB, type QueryLog, zkfairQueryLogs } from "./schema";
import { getArtifactDir, weightsToFields } from "./utils";

export type { AuditRecord };

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
 * AuditAPI - High-level audit operations with contract integration
 * Provides both local computation and on-chain submission capabilities
 * Uses standardized Poseidon hash and JSON encoding
 */
const AuditAttestationResponseSchema = z.object({
	attestationHash: HashSchema,
	signature: z.string().startsWith("0x") as z.ZodType<Hex>,
	passed: z.boolean(),
});

export class AuditAPI {
	private readonly attestationUrl: string;

	constructor(private contracts: ContractClient) {
		const config = getDefaultConfig();
		this.attestationUrl = config.attestationServiceUrl;
	}

	private buildLeafIndex(records: AuditRecord[]) {
		const leaves: string[] = [];
		const indexBySeq = new Map<number, number>();
		for (const [i, rec] of records.entries()) {
			leaves.push(hashRecordLeaf(rec).toLowerCase());
			indexBySeq.set(rec.seqNum, i);
		}
		return { leaves, indexBySeq };
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

		const { leaves, indexBySeq } = this.buildLeafIndex(records);
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

		const artifactDir = getArtifactDir(weightsHash);

		const pathsFile = Bun.file(`${artifactDir}/paths.json`);
		if (!(await pathsFile.exists())) {
			throw new Error(`Artifact directory not found: ${artifactDir}`);
		}
		const paths = parsePathsFile(await pathsFile.json());

		const weightsBuffer = await Bun.file(paths.weights).arrayBuffer();
		const modelWeightsFields = await weightsToFields(
			new Float32Array(weightsBuffer),
		);

		const fairnessConfig = parseFairnessThresholdFile(
			await Bun.file(paths.fairnessThreshold).json(),
		);

		const sampledRecords = sampleIndices.map((idx) => {
			const record = records[idx];
			if (!record) {
				throw new Error(
					`Sample index ${idx} out of bounds (records: ${records.length})`,
				);
			}
			return record;
		});

		const sampleFeatures = sampledRecords.flatMap((r) => {
			const features = [...r.features];
			while (features.length < NUM_FEATURES) features.push(0);
			return features.slice(0, NUM_FEATURES).map(String);
		});
		const sampleSensitiveAttrs = sampledRecords.map((r) =>
			String(r.sensitiveAttr),
		);

		const actualSampleCount = sampleIndices.length;
		const sampleValid: boolean[] = [];
		for (let i = 0; i < SAMPLE_SIZE; i++) {
			sampleValid.push(i < actualSampleCount);
		}

		// Pad to SAMPLE_SIZE — circuit skips invalid entries
		while (sampleFeatures.length < NUM_FEATURES * SAMPLE_SIZE) {
			sampleFeatures.push("0");
		}
		while (sampleSensitiveAttrs.length < SAMPLE_SIZE) {
			sampleSensitiveAttrs.push("0");
		}

		// Pad Merkle proofs to SAMPLE_SIZE
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

		const input: fairness_auditInputType = {
			_model_weights: modelWeightsFields.map(String),
			_sample_count: String(actualSampleCount),
			_sample_valid: sampleValid,
			_sample_features: sampleFeatures,
			_sample_sensitive_attrs: sampleSensitiveAttrs,
			_merkle_proofs: circuitMerkleProofs,
			_merkle_path_indices: circuitPathIndices,
			_merkle_depth: String(TREE_DEPTH),
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

		const noir = new Noir(fairness_audit_circuit as CompiledCircuit);

		let zkProof: Hex;
		let publicInputs: `0x${string}`[];
		let circuitPassed = true;

		try {
			const { witness } = await noir.execute(input);
			const backend = new UltraHonkBackend(fairness_audit_circuit.bytecode);
			const proofData = await backend.generateProof(witness);

			zkProof = bytesToHash(proofData.proof) as Hex;
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

		// Don't send circuitPassed — attestation service must verify proof itself
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
			const body = (await attestationResponse.json()) as {
				error?: string;
			};
			throw new Error(
				`Attestation service error: ${body.error || attestationResponse.statusText}`,
			);
		}

		const attestation = AuditAttestationResponseSchema.parse(
			await attestationResponse.json(),
		);

		return {
			zkProof,
			publicInputs: circuitPassed ? (publicInputs as unknown as Hex[]) : [],
			attestationHash: attestation.attestationHash,
			signature: attestation.signature,
			passed: attestation.passed,
		};
	}

	async createProof(
		records: AuditRecord[],
		seqNum: number,
	): Promise<AuditProof> {
		if (records.length === 0) {
			throw new Error("No records provided");
		}

		const { leaves, indexBySeq } = this.buildLeafIndex(records);
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

		const audit = await this.contracts.getAudit(event.auditId);
		if (audit.responded) {
			console.log(`Audit ${event.auditId} already has a response, skipping.`);
			return { txHash: "0x" as Hash, passed: audit.status === 1 }; // AuditStatus.PASSED = 1
		}

		const batch = await this.contracts.getBatch(event.batchId);
		const startSeq = Number(batch.seqNumStart);
		const endSeq = Number(batch.seqNumEnd);
		const modelId = batch.modelId;

		console.log(
			`Batch covers seqNum ${startSeq} to ${endSeq}, modelId: ${modelId}`,
		);

		const model = await this.contracts.getModel(modelId);
		const weightsHash = model.weightsHash as Hash;
		console.log(`Model weightsHash: ${weightsHash}`);

		const records = await db
			.select()
			.from(zkfairQueryLogs)
			.where(between(zkfairQueryLogs.seq, startSeq, endSeq))
			.orderBy(asc(zkfairQueryLogs.seq));

		if (records.length === 0) {
			throw new Error(`No records found for seq range ${startSeq}-${endSeq}`);
		}

		console.log(`Loaded ${records.length} records from storage`);

		const auditRecords: AuditRecord[] = records.map((r: QueryLog) => ({
			seqNum: r.seq,
			modelId: r.modelId,
			features: r.features,
			sensitiveAttr: r.sensitiveAttr,
			prediction: r.prediction,
			timestamp: r.timestamp,
		}));

		const { root } = await this.buildBatch(auditRecords);
		console.log(`Built Merkle tree with root ${root}`);

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

	async requestAudit(batchId: bigint): Promise<Hash> {
		return await this.contracts.requestAudit(batchId);
	}

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

	async slashExpiredAudit(auditId: bigint): Promise<Hash> {
		return await this.contracts.slashExpiredAudit(auditId);
	}
}
