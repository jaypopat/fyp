import { BatchAPI } from "./batch";
import { ContractClient } from "./contract";
import { EventsAPI } from "./events";
import { ModelAPI } from "./model";
import type { ZkFairOptions } from "./types";

type BrowserSDKOptions = Omit<ZkFairOptions, "privateKey">;

export class BrowserSDK {
	public readonly model: ModelAPI;
	public readonly batch: BatchAPI;
	public readonly events: EventsAPI;
	private readonly contracts: ContractClient;

	constructor(options: BrowserSDKOptions = {}) {
		this.contracts = new ContractClient(options);
		this.model = new ModelAPI(this.contracts);
		this.batch = new BatchAPI(this.contracts);
		this.events = new EventsAPI(this.contracts);
	}
}

export { getDefaultConfig } from "./config";
// Re-export event types for use in browser apps
export type {
	AuditExpiredEvent,
	AuditProofSubmittedEvent,
	AuditRequestedEvent,
	BatchCommittedEvent,
	DisputeRaisedEvent,
	ModelCertifiedEvent,
	ModelRegisteredEvent,
	ProviderSlashedEvent,
	StakeWithdrawnEvent,
} from "./events";
// Re-export browser-safe types (no Noir dependencies)
export type { AuditRecord } from "./hash";
export { hashRecordLeaf } from "./hash";
