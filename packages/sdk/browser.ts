import type { Hex } from "viem";
import { ContractClient } from "./contract";
import { InferenceClient } from "./inference";
import { ModelAPI } from "./model";
import type { ZkFairOptions } from "./types";

export type BrowserSDKOptions = Omit<ZkFairOptions, "privateKey">;

export class BrowserSDK {
	public readonly model: ModelAPI;
	private readonly contracts: ContractClient;
	public inference: InferenceClient | undefined;

	constructor(options: BrowserSDKOptions) {
		this.contracts = new ContractClient(options);
		this.model = new ModelAPI(this.contracts);
	}

	initInference(providerPubKey?: Hex, macKey?: Hex) {
		this.inference = new InferenceClient(providerPubKey, macKey);
		return this.inference;
	}
}

export function createBrowserSDK(options: BrowserSDKOptions) {
	return new BrowserSDK(options);
}
