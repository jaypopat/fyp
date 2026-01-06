import {
	and,
	asc,
	between,
	eq,
	gte,
	inArray,
	isNull,
	lte,
	sql,
} from "drizzle-orm";
import type { Hex } from "viem";
import {
	createReceiptHashes,
	createSignedReceipt,
	type ReceiptData,
	type ReceiptHashes,
	type SignedReceipt,
	signReceiptHash,
	verifyReceipt,
} from "./receipt";
import {
	type Batch,
	type DrizzleDB,
	type NewBatch,
	type NewQueryLog,
	type QueryLog,
	zkfairBatches,
	zkfairQueryLogs,
	zkfairSchema,
} from "./schema";
import { SDK } from "./sdk";
import type { ZkFairOptions } from "./types";

/**
 * Audit record for batch merkle tree
 */
export interface AuditRecord {
	seqNum: number;
	modelId: number;
	features: number[];
	sensitiveAttr: number;
	prediction: number;
	timestamp: number;
}

/**
 * Provider SDK options
 */
export interface ProviderSDKOptions extends ZkFairOptions {
	/**
	 * Provider's private key for signing receipts and transactions
	 */
	privateKey: Hex;

	/**
	 * Drizzle database instance with zkfairSchema
	 */
	db: DrizzleDB;

	/**
	 * Batch configuration (optional)
	 */
	batchConfig?: Partial<BatchConfig>;
}

/**
 * Batch configuration
 */
export interface BatchConfig {
	batchSize: number;
	maxBatchAgeMs: number;
}

export const DEFAULT_BATCH_CONFIG: BatchConfig = {
	batchSize: 100,
	maxBatchAgeMs: 30 * 60 * 1000, // 30 minutes
};

/**
 * Result of batch creation
 */
export interface BatchResult {
	batch: Batch;
	txHash: Hex;
	root: Hex;
	recordCount: number;
}

/**
 * High-level SDK for model inference providers
 *
 * Bundles all provider functionality:
 * - Query storage
 * - Receipt creation and signing
 * - Batch management
 * - Audit request handling
 * - Contract interactions (via underlying SDK)
 */
export class ProviderSDK {
	/**
	 * Underlying SDK instance for direct contract access
	 */
	public readonly sdk: SDK;

	/**
	 * Drizzle database instance
	 */
	public readonly db: DrizzleDB;

	private readonly privateKey: Hex;
	private readonly batchConfig: BatchConfig;

	constructor(options: ProviderSDKOptions) {
		if (!options.privateKey) {
			throw new Error("privateKey is required for ProviderSDK");
		}
		if (!options.db) {
			throw new Error("db is required for ProviderSDK");
		}

		this.privateKey = options.privateKey;
		this.db = options.db;
		this.batchConfig = { ...DEFAULT_BATCH_CONFIG, ...options.batchConfig };

		// Initialize underlying SDK
		this.sdk = new SDK({
			privateKey: options.privateKey,
			environment: options.environment,
		});
	}

	// ============================================
	// QUERY OPERATIONS
	// ============================================

	/**
	 * Store an inference query and return sequence number
	 */
	async insertQuery(data: NewQueryLog): Promise<number> {
		const [row] = await this.db
			.insert(zkfairQueryLogs)
			.values(data)
			.returning({ seq: zkfairQueryLogs.seq });

		if (!row?.seq) throw new Error("Insert failed - no seq returned");
		return row.seq;
	}

	/**
	 * Get a query by sequence number
	 */
	async getQuery(seqNum: number): Promise<QueryLog | undefined> {
		const [row] = await this.db
			.select()
			.from(zkfairQueryLogs)
			.where(eq(zkfairQueryLogs.seq, seqNum))
			.limit(1);
		return row;
	}

	// ============================================
	// RECEIPT OPERATIONS
	// ============================================

	/**
	 * Create hashes for receipt data without signing
	 */
	createReceiptHashes(data: ReceiptData): ReceiptHashes {
		return createReceiptHashes(data);
	}

	/**
	 * Sign a receipt data hash
	 */
	async signReceiptHash(dataHash: Hex): Promise<Hex> {
		return signReceiptHash(dataHash, this.privateKey);
	}

	/**
	 * Create and sign a complete receipt
	 */
	async createSignedReceipt(data: ReceiptData): Promise<SignedReceipt> {
		return createSignedReceipt(data, this.privateKey);
	}

	/**
	 * Verify a receipt signature
	 */
	async verifyReceipt(
		receipt: SignedReceipt,
		expectedSigner: Hex,
	): Promise<boolean> {
		return verifyReceipt(receipt, expectedSigner);
	}

	// ============================================
	// BATCH OPERATIONS
	// ============================================

	/**
	 * Check if batching should be triggered
	 */
	async shouldBatch(): Promise<boolean> {
		const [countRow] = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(zkfairQueryLogs)
			.where(isNull(zkfairQueryLogs.batchId));
		const count = countRow?.count ?? 0;

		if (count === 0) return false;
		if (count >= this.batchConfig.batchSize) return true;

		const [oldestRow] = await this.db
			.select({ timestamp: zkfairQueryLogs.timestamp })
			.from(zkfairQueryLogs)
			.where(isNull(zkfairQueryLogs.batchId))
			.orderBy(asc(zkfairQueryLogs.timestamp))
			.limit(1);

		if (oldestRow?.timestamp !== undefined) {
			const age = Date.now() - oldestRow.timestamp;
			if (age >= this.batchConfig.maxBatchAgeMs) return true;
		}
		return false;
	}

	/**
	 * Create a batch if thresholds are met
	 * @param force - Force batch creation regardless of thresholds
	 */
	async createBatchIfNeeded(force = false): Promise<BatchResult | undefined> {
		if (!force && !(await this.shouldBatch())) return undefined;

		const queries = await this.db
			.select()
			.from(zkfairQueryLogs)
			.where(isNull(zkfairQueryLogs.batchId))
			.orderBy(asc(zkfairQueryLogs.seq))
			.limit(this.batchConfig.batchSize);

		if (queries.length === 0) return undefined;

		const sequences = queries.map((q) => q.seq);
		const sorted = [...sequences].sort((a, b) => a - b);
		const startSeq = sorted[0]!;
		const endSeq = sorted[sorted.length - 1]!;
		const batchId = `${startSeq}-${endSeq}`;

		// Build Merkle tree
		const auditRecords = queries.map((q) => this.toAuditRecord(q));
		const { root } = await this.sdk.audit.buildBatch(auditRecords);

		const modelId = queries[0]!.modelId;

		// Create batch record
		const batchData: NewBatch = {
			id: batchId,
			startSeq,
			endSeq,
			merkleRoot: root,
			recordCount: queries.length,
			txHash: null,
			createdAt: Date.now(),
			committedAt: null,
		};

		const [batch] = await this.db
			.insert(zkfairBatches)
			.values(batchData)
			.returning();
		if (!batch) throw new Error("Failed to create batch");

		// Assign queries to batch
		if (sequences.length > 0) {
			await this.db
				.update(zkfairQueryLogs)
				.set({ batchId })
				.where(inArray(zkfairQueryLogs.seq, sequences));
		}

		// Commit to blockchain
		const txHash = await this.sdk.audit.commitBatch(
			BigInt(modelId),
			root,
			BigInt(queries.length),
			BigInt(startSeq),
			BigInt(endSeq),
		);

		// Mark as committed
		await this.db
			.update(zkfairBatches)
			.set({ txHash, committedAt: Date.now() })
			.where(eq(zkfairBatches.id, batchId));

		return {
			batch: { ...batch, txHash, committedAt: Date.now() },
			txHash,
			root,
			recordCount: queries.length,
		};
	}

	/**
	 * Generate Merkle proof for a query
	 */
	async generateProof(seqNum: number): Promise<{
		index: number;
		siblings: { sibling: string; position: "left" | "right" }[];
	}> {
		const query = await this.getQuery(seqNum);
		if (!query) throw new Error(`Query ${seqNum} not found`);
		if (!query.batchId) throw new Error(`Query ${seqNum} not yet batched`);

		const [batch] = await this.db
			.select()
			.from(zkfairBatches)
			.where(
				and(
					lte(zkfairBatches.startSeq, seqNum),
					gte(zkfairBatches.endSeq, seqNum),
				),
			)
			.limit(1);

		if (!batch) throw new Error(`Batch for query ${seqNum} not found`);

		const batchRecords = await this.db
			.select()
			.from(zkfairQueryLogs)
			.where(between(zkfairQueryLogs.seq, batch.startSeq, batch.endSeq))
			.orderBy(asc(zkfairQueryLogs.seq));

		const auditRecords = batchRecords.map((q) => this.toAuditRecord(q));
		const proof = await this.sdk.audit.createProof(auditRecords, seqNum);

		return { index: proof.index, siblings: proof.proof };
	}

	// ============================================
	// HELPERS
	// ============================================

	private toAuditRecord(query: QueryLog): AuditRecord {
		return {
			seqNum: query.seq,
			modelId: query.modelId,
			features: query.features,
			sensitiveAttr: query.sensitiveAttr,
			prediction: query.prediction,
			timestamp: query.timestamp,
		};
	}

	// ============================================
	// AUDIT HANDLING
	// ============================================

	/**
	 * Watch for audit requests and handle them automatically
	 */
	watchAuditRequests(
		handler?: (event: {
			auditId: bigint;
			txHash: Hex;
			passed: boolean;
		}) => void,
	): void {
		this.sdk.events.watchAuditRequested(async (event) => {
			const result = await this.sdk.audit.handleAuditRequest(event, this.db);
			handler?.({ auditId: event.auditId, ...result });
		});
	}

	// ============================================
	// PERIODIC BATCH CHECK
	// ============================================

	private batchCheckInterval: ReturnType<typeof setInterval> | null = null;

	/**
	 * Start periodic batch checking
	 */
	startPeriodicBatchCheck(intervalMs = 5 * 60 * 1000): void {
		if (this.batchCheckInterval) return;

		this.batchCheckInterval = setInterval(async () => {
			try {
				await this.createBatchIfNeeded();
			} catch (error) {
				console.error("Periodic batch check failed:", error);
			}
		}, intervalMs);
	}

	/**
	 * Stop periodic batch checking
	 */
	stopPeriodicBatchCheck(): void {
		if (this.batchCheckInterval) {
			clearInterval(this.batchCheckInterval);
			this.batchCheckInterval = null;
		}
	}
}

export type {
	ReceiptData,
	ReceiptHashes,
	SignedReceipt,
} from "./receipt";
// Re-export types
export type { Batch, NewQueryLog, QueryLog } from "./schema";
