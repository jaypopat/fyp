import { BatchAPI } from "./batch";
import { ContractClient } from "./contract";
import { ModelAPI } from "./model";
import type { ZkFairOptions } from "./types";

export type BrowserSDKOptions = Omit<ZkFairOptions, "privateKey">;

export class BrowserSDK {
	public readonly model: ModelAPI;
	public readonly batch: BatchAPI;
	private readonly contracts: ContractClient;

	constructor(options: BrowserSDKOptions) {
		this.contracts = new ContractClient(options);
		this.model = new ModelAPI(this.contracts);
		this.batch = new BatchAPI(this.contracts);
	}
}

export function createBrowserSDK(options: BrowserSDKOptions) {
	return new BrowserSDK(options);
}
