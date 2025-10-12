import { Client } from "./client";
import { ContractClient } from "./contract";
import { ModelAPI } from "./model";
import type { ZkFairOptions } from "./types";

export type BrowserSDKOptions = Omit<ZkFairOptions, "privateKey">;

export class BrowserSDK {
	public readonly model: ModelAPI;
	private readonly contracts: ContractClient;
	public readonly client: Client;

	constructor(options: BrowserSDKOptions) {
		this.contracts = new ContractClient(options);
		this.model = new ModelAPI(this.contracts);
		this.client = new Client();
	}
}

export function createBrowserSDK(options: BrowserSDKOptions) {
	return new BrowserSDK(options);
}
