import { BatchAPI } from "./batch";
import { ContractClient } from "./contract";
import { EventsAPI } from "./events";
import { ModelAPI } from "./model";
import type { ZkFairOptions } from "./types";

export class BrowserSDK {
	public readonly model: ModelAPI;
	public readonly batch: BatchAPI;
	public readonly events: EventsAPI;
	private readonly contracts: ContractClient;

	constructor(options: ZkFairOptions) {
		this.contracts = new ContractClient(options);
		this.model = new ModelAPI(this.contracts);
		this.batch = new BatchAPI(this.contracts);
		this.events = new EventsAPI(this.contracts);
	}
}
