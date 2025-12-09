import Dexie, { type Table } from "dexie";

export interface SentinelReceipt {
	id?: number;
	seqNum: number; // Primary identifier from provider
	modelId: number;
	timestamp: number;

	// Provider info for status checking
	providerUrl: string;

	// Inference data
	features: number[];
	sensitiveAttr: number;
	prediction: number;

	// Cryptographic binding
	dataHash: string;
	featuresHash?: string; // For on-chain disputes
	providerSignature: string;

	// Status tracking
	status: "PENDING" | "BATCHED" | "COMMITTED" | "VERIFIED" | "FRAUD_DETECTED";
	batchId?: string;
	batchMerkleRoot?: string;
	batchTxHash?: string;
	verifiedAt?: number;

	// Fraud info - only set when status is FRAUD_DETECTED
	fraudType?: "NON_INCLUSION" | "FRAUDULENT_INCLUSION";
	fraudBatchId?: string; // bigint as string
}

export class SentinelDatabase extends Dexie {
	receipts!: Table<SentinelReceipt>;

	constructor() {
		super("ZKFairSentinel");
		this.version(4).stores({
			// Index by seqNum for fast lookups
			// Index by status to find what needs checking
			// Index by timestamp for ordering
			// Compound index for model+time queries
			receipts:
				"++id, seqNum, status, timestamp, [modelId+timestamp], [providerUrl+seqNum]",
		});
	}
}

export const db = new SentinelDatabase();
