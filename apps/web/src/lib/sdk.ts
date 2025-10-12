import { BrowserSDK } from "@zkfair/sdk/browser";
import type { Hash } from "viem";
import { anvil, sepolia } from "viem/chains";

/**
 * Create a configured BrowserSDK instance
 * Uses environment variables for contract address, RPC URL, and chain
 */
export function createSDK() {
	const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
	const rpcUrl = import.meta.env.VITE_RPC_URL;
	const chainId = import.meta.env.VITE_CHAIN_ID;

	if (!contractAddress) {
		throw new Error(
			"VITE_CONTRACT_ADDRESS environment variable is not set. Please add it to your .env file.",
		);
	}

	const chain = chainId === "11155111" ? sepolia : anvil;

	return new BrowserSDK({
		contractAddress,
		rpcUrl,
		chain,
	});
}
