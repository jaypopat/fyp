import { BrowserSDK } from "@zkfair/sdk/browser";
import type { Chain, Hash } from "viem";
import * as chains from "viem/chains";

function getChain(): Chain {
	const chainId = import.meta.env.VITE_CHAIN_ID;

	if (!chainId) {
		throw new Error("VITE_CHAIN_ID environment variable is not set");
	}

	const numericChainId = Number.parseInt(chainId, 10);

	const chainMap: Record<number, Chain> = {
		1: chains.mainnet,
		11155111: chains.sepolia,
		137: chains.polygon,
		80002: chains.polygonAmoy,
		8453: chains.base,
		84532: chains.baseSepolia,
		10: chains.optimism,
		42161: chains.arbitrum,
	};

	const chain = chainMap[numericChainId];

	if (!chain) {
		throw new Error(`Unsupported or unknown chain ID: ${numericChainId}`);
	}

	return chain;
}

/**
 * Create a configured BrowserSDK instance
 * Uses environment variables for contract address, RPC URL, and chain
 */
export function createSDK() {
	const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
	const rpcUrl = import.meta.env.VITE_RPC_URL;

	if (!contractAddress) {
		throw new Error(
			"VITE_CONTRACT_ADDRESS environment variable is not set. Please add it to your .env file.",
		);
	}

	if (!rpcUrl) {
		throw new Error(
			"VITE_RPC_URL environment variable is not set. Please add it to your .env file.",
		);
	}

	return new BrowserSDK({
		contractAddress: contractAddress as Hash,
		rpcUrl,
		chain: getChain(),
	});
}
