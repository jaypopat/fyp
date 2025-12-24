import { hashRecordLeaf } from "@zkfair/sdk/browser";
import { verifyMerkleProof } from "@zkfair/sdk/merkle";
import type { Hex } from "viem";
import { db, type SentinelReceipt } from "./db";
import { sdk } from "./sdk";

type BatchInfo = {
  batchId: bigint;
  seqNumStart: number;
  seqNumEnd: number;
  merkleRoot: Hex;
  committedAt: number;
};

type MerkleProof = {
  index: number;
  siblings: { sibling: string; position: "left" | "right" }[];
};

export type VerificationResult =
  | { status: "PENDING"; reason: string }
  | { status: "VERIFIED"; batch: BatchInfo }
  | { status: "FRAUD_NON_INCLUSION"; reason: string }
  | { status: "FRAUD_INVALID_PROOF"; reason: string; batch: BatchInfo };

const GRACE_PERIOD_MS = 60 * 60 * 1000; // 1 hour, matches contract

/**
 * Find the on-chain batch containing a seqNum
 */
async function findBatch(
  modelId: number,
  seqNum: number,
): Promise<BatchInfo | null> {
  const batchIds = await sdk.batch.getIdsByModel(BigInt(modelId));

  for (const batchId of batchIds) {
    const batch = await sdk.batch.get(batchId);
    const start = Number(batch.seqNumStart);
    const end = Number(batch.seqNumEnd);

    if (seqNum >= start && seqNum <= end) {
      return {
        batchId,
        seqNumStart: start,
        seqNumEnd: end,
        merkleRoot: batch.merkleRoot as Hex,
        committedAt: Number(batch.committedAt),
      };
    }
  }
  return null;
}

/**
 * Fetch Merkle proof from provider
 */
async function fetchProof(
  providerUrl: string,
  seqNum: number,
): Promise<MerkleProof | null> {
  const res = await fetch(`${providerUrl}/proof/${seqNum}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.proof;
}

/**
 * Compute leaf hash from receipt data using Poseidon (matches circuit)
 * This is the same hash the ZK circuit computes for verification
 */
function computeLeafHash(receipt: SentinelReceipt): string {
  return hashRecordLeaf({
    seqNum: receipt.seqNum,
    modelId: receipt.modelId,
    features: receipt.features,
    sensitiveAttr: receipt.sensitiveAttr,
    prediction: receipt.prediction,
    timestamp: receipt.timestamp,
  });
}

/**
 * Verify a Merkle proof against an on-chain root
 */
async function verifyProof(
  leafHash: string,
  proof: MerkleProof,
  merkleRoot: Hex,
): Promise<boolean> {
  return verifyMerkleProof(leafHash, merkleRoot, proof.siblings);
}

// ============================================
// MAIN API
// ============================================

/**
 * Verify a receipt against the blockchain
 * Returns the verification status with all relevant details
 */
export async function verifyReceipt(
  receipt: SentinelReceipt,
): Promise<VerificationResult> {
  // 1. Find on-chain batch for this seqNum
  const batch = await findBatch(receipt.modelId, receipt.seqNum);

	if (!batch) {
		// No batch contains this seqNum
		const gracePeriodPassed = Date.now() > receipt.timestamp + GRACE_PERIOD_MS;

    if (gracePeriodPassed) {
      return {
        status: "FRAUD_NON_INCLUSION",
        reason: "Query was never batched and grace period has passed",
      };
    }

    return {
      status: "PENDING",
      reason: "Query not yet batched on-chain",
    };
  }

  // 2. Batch exists - fetch proof from provider
  const proof = await fetchProof(receipt.providerUrl, receipt.seqNum);

  if (!proof) {
    // Provider won't/can't give proof for a seqNum in their batch range = fraud
    return {
      status: "FRAUD_INVALID_PROOF",
      reason: "Provider cannot provide Merkle proof for seqNum in batch range",
      batch,
    };
  }

  // 3. Verify proof against on-chain root
  const leafHash = computeLeafHash(receipt);
  const isValid = await verifyProof(leafHash, proof, batch.merkleRoot);

  if (!isValid) {
    return {
      status: "FRAUD_INVALID_PROOF",
      reason: "Merkle proof invalid - provider tampered with data",
      batch,
    };
  }

  return { status: "VERIFIED", batch };
}

/**
 * Verify receipt and update local DB status
 * Convenience wrapper that handles DB persistence
 */
export async function verifyAndUpdateReceipt(
  receipt: SentinelReceipt,
): Promise<VerificationResult> {
  const result = await verifyReceipt(receipt);

  if (receipt.id === undefined) return result;

  // Update DB based on result
  switch (result.status) {
    case "VERIFIED":
      await db.receipts.update(receipt.id, {
        status: "VERIFIED",
        batchId: result.batch.batchId.toString(),
        batchMerkleRoot: result.batch.merkleRoot,
        verifiedAt: Date.now(),
      });
      break;

    case "FRAUD_NON_INCLUSION":
      await db.receipts.update(receipt.id, {
        status: "FRAUD_DETECTED",
        fraudType: "NON_INCLUSION",
      });
      break;

    case "FRAUD_INVALID_PROOF":
      await db.receipts.update(receipt.id, {
        status: "FRAUD_DETECTED",
        batchId: result.batch.batchId.toString(),
        batchMerkleRoot: result.batch.merkleRoot,
        fraudType: "FRAUDULENT_INCLUSION",
        fraudBatchId: result.batch.batchId.toString(),
      });
      break;

    case "PENDING":
      await db.receipts.update(receipt.id, { status: "PENDING" });
      break;
  }

  return result;
}

/**
 * Get dispute info for a fraud result
 * Only call this after verifyReceipt returns a FRAUD status
 */
export function getDisputeInfo(result: VerificationResult):
  | {
    canDispute: true;
    type: "NON_INCLUSION" | "FRAUDULENT_INCLUSION";
    batchId?: bigint;
  }
  | {
    canDispute: false;
  } {
  switch (result.status) {
    case "FRAUD_NON_INCLUSION":
      return { canDispute: true, type: "NON_INCLUSION" };

    case "FRAUD_INVALID_PROOF":
      return {
        canDispute: true,
        type: "FRAUDULENT_INCLUSION",
        batchId: result.batch.batchId,
      };

    default:
      return { canDispute: false };
  }
}
