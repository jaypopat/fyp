import type { Hash } from "viem";
import type { ContractClient } from "./contract";
import type { DisputeRaisedEvent } from "./events";

/**
 * Dispute API
 * Handles all dispute-related operations:
 * - Challenging missing queries (Non-Inclusion)
 * - Challenging invalid proofs (Fraudulent Inclusion)
 * - Monitoring dispute events
 */
export class DisputeAPI {
	constructor(private contracts: ContractClient) {}

	/**
	 * Get the required dispute stake amount
	 * @returns Dispute stake amount in wei
	 */
	async getDisputeStake(): Promise<bigint> {
		return this.contracts.getDisputeStake();
	}

	/**
	 * Dispute when provider never batched a query (Type A fraud)
	 * User must have a signed receipt from provider proving the query existed
	 * @param modelId Model ID from receipt
	 * @param seqNum Sequence number from receipt
	 * @param timestamp Timestamp from receipt
	 * @param featuresHash Hash of features (for privacy, user doesn't reveal actual features)
	 * @param sensitiveAttr Sensitive attribute from receipt
	 * @param prediction Prediction from receipt (scaled by 1e6)
	 * @param providerSignature Provider's signature on the receipt data
	 * @returns Transaction hash
	 */
	async disputeNonInclusion(
		modelId: bigint,
		seqNum: bigint,
		timestamp: bigint,
		featuresHash: Hash,
		sensitiveAttr: bigint,
		prediction: bigint,
		providerSignature: `0x${string}`,
	) {
		return this.contracts.disputeNonInclusion(
			modelId,
			seqNum,
			timestamp,
			featuresHash,
			sensitiveAttr,
			prediction,
			providerSignature,
		);
	}

	/**
	 * Dispute when provider batched wrong/tampered data (Type B fraud)
	 * The batch commitment itself is the provider's on-chain attestation.
	 * If seqNum is in range but Merkle proof fails, it's fraud.
	 * @param batchId The batch that claims to contain this query
	 * @param seqNum Sequence number that should be in the batch
	 * @param leafHash The leaf hash computed from user's local receipt data
	 * @param merkleProof Array of sibling hashes for Merkle proof
	 * @param proofPositions Array of positions (0=left, 1=right) for each sibling
	 * @returns Transaction hash
	 */
	async disputeFraudulentInclusion(
		batchId: bigint,
		seqNum: bigint,
		leafHash: Hash,
		merkleProof: Hash[],
		proofPositions: number[],
	) {
		return this.contracts.disputeFraudulentInclusion(
			batchId,
			seqNum,
			leafHash,
			merkleProof,
			proofPositions,
		);
	}

	/**
	 * Watch for DisputeRaised events
	 * @param callback Function to call when event is detected
	 */
	watchDisputeRaised(callback: (event: DisputeRaisedEvent) => void) {
		return this.contracts.watchDisputeRaised(callback);
	}

	/**
	 * Get historical DisputeRaised events
	 * @param fromBlock Start block (optional)
	 * @param toBlock End block (optional)
	 */
	async getDisputeRaisedHistory(fromBlock?: bigint, toBlock?: bigint) {
		return this.contracts.getDisputeRaisedEvents(fromBlock, toBlock);
	}
}
