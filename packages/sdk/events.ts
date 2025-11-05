import type { ContractClient } from "./contract";
import type { ExtractAllEventArgs } from "./types";

type ZkFairAbi = typeof import("@zkfair/contracts/abi").zkFairAbi;

// Export all event types with Required fields (non-optional)
export type ModelRegisteredEvent = ExtractAllEventArgs<
	ZkFairAbi,
	"ModelRegistered"
>;
export type ModelCertifiedEvent = ExtractAllEventArgs<
	ZkFairAbi,
	"ModelCertified"
>;
export type BatchCommittedEvent = ExtractAllEventArgs<
	ZkFairAbi,
	"BatchCommitted"
>;
export type AuditRequestedEvent = ExtractAllEventArgs<
	ZkFairAbi,
	"AuditRequested"
>;
export type AuditProofSubmittedEvent = ExtractAllEventArgs<
	ZkFairAbi,
	"AuditProofSubmitted"
>;
export type AuditExpiredEvent = ExtractAllEventArgs<ZkFairAbi, "AuditExpired">;
export type ProviderSlashedEvent = ExtractAllEventArgs<
	ZkFairAbi,
	"ProviderSlashed"
>;
export type StakeWithdrawnEvent = ExtractAllEventArgs<
	ZkFairAbi,
	"StakeWithdrawn"
>;

/**
 * High-level events API
 * Provides clean interface for watching and querying contract events
 */
export class EventsAPI {
	constructor(private contracts: ContractClient) {}

	watchModelRegistered(callback: (event: ModelRegisteredEvent) => void) {
		return this.contracts.watchModelRegistered(callback);
	}

	watchModelCertified(callback: (event: ModelCertifiedEvent) => void) {
		return this.contracts.watchModelCertified(callback);
	}

	watchBatchCommitted(callback: (event: BatchCommittedEvent) => void) {
		return this.contracts.watchBatchCommitted(callback);
	}

	watchAuditRequested(callback: (event: AuditRequestedEvent) => void) {
		return this.contracts.watchAuditRequested(callback);
	}

	watchAuditProofSubmitted(
		callback: (event: AuditProofSubmittedEvent) => void,
	) {
		return this.contracts.watchAuditProofSubmitted(callback);
	}

	watchAuditExpired(callback: (event: AuditExpiredEvent) => void) {
		return this.contracts.watchAuditExpired(callback);
	}

	watchProviderSlashed(callback: (event: ProviderSlashedEvent) => void) {
		return this.contracts.watchProviderSlashed(callback);
	}

	watchStakeWithdrawn(callback: (event: StakeWithdrawnEvent) => void) {
		return this.contracts.watchStakeWithdrawn(callback);
	}

	// ============================================
	// HISTORICAL EVENT QUERIES
	// ============================================

	async getModelRegisteredHistory(fromBlock?: bigint, toBlock?: bigint) {
		return this.contracts.getModelRegisteredEvents(fromBlock, toBlock);
	}

	async getBatchCommittedHistory(fromBlock?: bigint, toBlock?: bigint) {
		return this.contracts.getBatchCommittedEvents(fromBlock, toBlock);
	}

	async getAuditRequestedHistory(fromBlock?: bigint, toBlock?: bigint) {
		return this.contracts.getAuditRequestedEvents(fromBlock, toBlock);
	}
}
