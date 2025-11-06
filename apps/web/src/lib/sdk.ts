import { BrowserSDK } from "@zkfair/sdk/browser";
import type { Hash } from "viem";
import { config } from "@/config";

export const sdk = new BrowserSDK({
	contractAddress: config.contractAddress as Hash,
	rpcUrl: config.rpcUrl,
	chain: config.chain,
});
