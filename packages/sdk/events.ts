import type { GetEventArgs } from "viem";
import type { ContractClient } from "./contract";

type ZkFairAbi = typeof import("@zkfair/contracts/abi").zkFairAbi;

export type ModelRegisteredEvent = GetEventArgs<ZkFairAbi, "ModelRegistered">;
export type ModelVerifiedEvent = GetEventArgs<ZkFairAbi, "ModelVerified">;
export type AuditRequestedEvent = GetEventArgs<ZkFairAbi, "AuditRequested">;

export class EventsAPI {
	constructor(private contracts: ContractClient) {}

	/**
	 * Watch for new model registrations
	 * Returns unwatch function to stop listening
	 */
	watchModelRegistered(callback: (event: ModelRegisteredEvent) => void) {
		return this.contracts.watchModelRegistered(callback);
	}

	/**
	 * Watch for model verification results
	 * Returns unwatch function to stop listening
	 */
	watchModelVerified(callback: (event: ModelVerifiedEvent) => void) {
		return this.contracts.watchModelVerified(callback);
	}

	/**
	 * Watch for audit requests (when contract supports it)
	 * Returns unwatch function to stop listening
	 */
	watchAuditRequested(callback: (event: AuditRequestedEvent) => void) {
		return this.contracts.watchAuditRequested({} as any); // todo - add callback once event is added to smart contract
	}

	/**
	 * Get historical ModelRegistered events
	 */
	async getModelRegisteredHistory(fromBlock?: bigint, toBlock?: bigint) {
		return this.contracts.getModelRegisteredEvents(fromBlock, toBlock);
	}

	/**
	 * Get historical ModelVerified events
	 */
	async getModelVerifiedHistory(fromBlock?: bigint, toBlock?: bigint) {
		return this.contracts.getModelVerifiedEvents(fromBlock, toBlock);
	}
}
