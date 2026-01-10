import type { BatchCommittedEvent } from "@zkfair/sdk/browser";
import { toast } from "sonner";
import { getGracePeriodMs } from "./constants";
import { db, type SentinelReceipt } from "./db";
import { onBatchCommitted } from "./event-store";
import { sdk } from "./sdk";
import { verifyAndUpdateReceipt } from "./sentinel";

/**
 * Check if a receipt has exceeded the grace period for batching
 * In demo mode: instant (0ms), production: 1 hour
 */
function hasGracePeriodExpired(receipt: SentinelReceipt): boolean {
	const timeSinceQuery = Date.now() - receipt.timestamp;
	return timeSinceQuery > getGracePeriodMs();
}

/**
 * Check all pending receipts for a given model when a batch is committed
 */
async function checkReceiptsForBatch(event: BatchCommittedEvent) {
	const { modelId, batchId } = event;

	// Get batch details from contract to get sequence range
	const batchData = await sdk.batch.get(batchId);
	const startSeq = Number(batchData.seqNumStart);
	const endSeq = Number(batchData.seqNumEnd);

	console.log(
		`[FraudDetector] Checking receipts for batch ${batchId} (model ${modelId}, seqNum ${startSeq}-${endSeq})`,
	);

	// Get all pending receipts for this model
	const pendingReceipts = await db.receipts
		.where("status")
		.anyOf(["PENDING", "BATCHED"])
		.filter((r) => r.modelId === Number(modelId))
		.toArray();

	if (pendingReceipts.length === 0) {
		console.log("[FraudDetector] No pending receipts for this model");
		return;
	}

	console.log(
		`[FraudDetector] Found ${pendingReceipts.length} pending receipts`,
	);

	for (const receipt of pendingReceipts) {
		const seqNum = receipt.seqNum;

		// Case 1: seqNum is in the batch range - verify Merkle proof
		if (seqNum >= startSeq && seqNum <= endSeq) {
			console.log(
				`[FraudDetector] Receipt #${seqNum} is in batch range, verifying...`,
			);
			await verifyAndCheckFraud(receipt);
		}
		// Case 2: seqNum is BEFORE the batch range - was skipped
		else if (seqNum < startSeq) {
			if (hasGracePeriodExpired(receipt)) {
				console.log(
					`[FraudDetector] Receipt #${seqNum} was skipped (seqNum < startSeq ${startSeq}) - NON-INCLUSION FRAUD`,
				);
				await markAsNonInclusion(receipt, batchId);
			} else {
				console.log(
					`[FraudDetector] Receipt #${seqNum} skipped but within grace period`,
				);
			}
		}
		// Case 3: seqNum is AFTER the batch range - may be in next batch
		else if (seqNum > endSeq) {
			if (hasGracePeriodExpired(receipt)) {
				console.log(
					`[FraudDetector] Receipt #${seqNum} excluded and grace period expired - NON-INCLUSION FRAUD`,
				);
				await markAsNonInclusion(receipt, batchId);
			} else {
				console.log(
					`[FraudDetector] Receipt #${seqNum} is after batch range, may be in next batch`,
				);
			}
		}
	}
}

/**
 * Verify a receipt and check for fraud
 */
async function verifyAndCheckFraud(receipt: SentinelReceipt) {
	try {
		const result = await verifyAndUpdateReceipt(receipt);

		if (
			result.status === "FRAUD_NON_INCLUSION" ||
			result.status === "FRAUD_INVALID_PROOF"
		) {
			notifyFraud(receipt, result.status);
		} else if (result.status === "VERIFIED") {
			notifyVerified(receipt);
		}
	} catch (error) {
		console.error(
			`[FraudDetector] Error verifying receipt #${receipt.seqNum}:`,
			error,
		);
	}
}

/**
 * Mark a receipt as Non-Inclusion fraud
 */
async function markAsNonInclusion(receipt: SentinelReceipt, batchId: bigint) {
	if (receipt.id === undefined) return;

	await db.receipts.update(receipt.id, {
		status: "FRAUD_DETECTED",
		fraudType: "NON_INCLUSION",
		fraudBatchId: batchId.toString(),
	});

	notifyFraud(receipt, "FRAUD_NON_INCLUSION");
}

/**
 * Show notification when fraud is detected
 */
function notifyFraud(
	receipt: SentinelReceipt,
	type: "FRAUD_NON_INCLUSION" | "FRAUD_INVALID_PROOF",
) {
	const message =
		type === "FRAUD_NON_INCLUSION"
			? `Query #${receipt.seqNum} was omitted from batch!`
			: `Query #${receipt.seqNum} has invalid Merkle proof!`;

	toast.error("🚨 Fraud Detected!", {
		description: message,
		duration: 10000,
		action: {
			label: "View Receipts",
			onClick: () => {
				window.location.href = "/receipts";
			},
		},
	});

	// Browser notification if permitted
	if ("Notification" in window && Notification.permission === "granted") {
		new Notification("ZKFair: Fraud Detected!", {
			body: message,
			icon: "/favicon.ico",
		});
	}
}

/**
 * Show notification when receipt is verified
 */
function notifyVerified(receipt: SentinelReceipt) {
	toast.success("Receipt Verified", {
		description: `Query #${receipt.seqNum} confirmed on-chain`,
		duration: 3000,
	});
}

// ============================================
// INITIALIZATION
// ============================================

let isInitialized = false;
let unsubscribe: (() => void) | null = null;

/**
 * Initialize the fraud detector
 * Subscribes to BatchCommitted events from the event store
 */
export function initializeFraudDetector() {
	if (isInitialized) return;

	console.log("[FraudDetector] Initializing...");

	// Subscribe to BatchCommitted events
	unsubscribe = onBatchCommitted((event) => {
		checkReceiptsForBatch(event);
	});

	// Request notification permission
	if ("Notification" in window && Notification.permission === "default") {
		Notification.requestPermission();
	}

	isInitialized = true;
	console.log("[FraudDetector] Initialized");
}

/**
 * Cleanup fraud detector
 */
export function cleanupFraudDetector() {
	if (unsubscribe) {
		unsubscribe();
		unsubscribe = null;
	}
	isInitialized = false;
	console.log("[FraudDetector] Cleaned up");
}

/**
 * Manually trigger a check for all pending receipts
 * Useful for initial page load or manual refresh
 */
export async function checkAllPendingReceipts() {
	console.log("[FraudDetector] Manual check of all pending receipts...");

	const pendingReceipts = await db.receipts
		.where("status")
		.anyOf(["PENDING", "BATCHED"])
		.toArray();

	for (const receipt of pendingReceipts) {
		await verifyAndCheckFraud(receipt);
	}
}
