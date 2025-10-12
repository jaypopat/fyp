import { BrowserSDK } from "@zkfair/sdk/browser";
import type { Hash } from "viem";
import { config } from "@/config";
/**
 * Create a configured BrowserSDK instance
 * Uses config from config.ts (auto-detects local vs production)
 */
export function createSDK() {
	return new BrowserSDK({
		contractAddress: config.contractAddress as Hash,
		rpcUrl: config.rpcUrl,
		chain: config.chain,
	});
}
