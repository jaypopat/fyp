import { Client } from "./client";
import { ContractClient } from "./contract";
import { ModelAPI } from "./model";
import type { ZkFairOptions } from "./types";
import { InferenceClient } from "./inference";
import type { Hex } from "viem";

export type BrowserSDKOptions = Omit<ZkFairOptions, "privateKey">;

export class BrowserSDK {
	public readonly model: ModelAPI;
	private readonly contracts: ContractClient;
	public readonly client: Client;
	public inference: InferenceClient | undefined;

	constructor(options: BrowserSDKOptions) {
		this.contracts = new ContractClient(options);
		this.model = new ModelAPI(this.contracts);
		this.client = new Client();
	}

	initInference(providerPubKey?: Hex, macKey?: Hex) {
		this.inference = new InferenceClient(providerPubKey, macKey);
		return this.inference;
	}
}

export function createBrowserSDK(options: BrowserSDKOptions) {
	return new BrowserSDK(options);
}
