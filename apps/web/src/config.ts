import type { Hash } from "viem";
import { anvil, sepolia } from "viem/chains";

type NetworkConfig = {
	contractAddress: Hash;
	rpcUrl: string;
	chain: typeof anvil | typeof sepolia;
	providerUrl: string;
	explorerBase: string;
};

type Config = {
	local: NetworkConfig;
	sepolia: NetworkConfig;
	isDevelopment: boolean;
};

/**
 * Configuration for different environments
 * Contract addresses and RPC URLs are public information
 */
const _config: Config = {
	local: {
		contractAddress: "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512",
		rpcUrl: "http://localhost:8545",
		chain: anvil,
		providerUrl: "http://localhost:5000",
		explorerBase: "https://app.tryethernal.com",
	},
	sepolia: {
		contractAddress: "0x74173c436dc39d963541bf95150b0f56f8ee199d",
		rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
		chain: sepolia,
		providerUrl: "https://zkfair-provider.fly.dev",
		explorerBase: "https://sepolia.etherscan.io",
	},
	isDevelopment: process.env.NODE_ENV !== "production",
};

// i will use this later in the registry for better filters/ representation rather than provider address hashes
export const providers: Record<string, Hash> = {
	ProviderA: "0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa" as Hash,
	ProviderB: "0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb" as Hash,
	ProviderC: "0xCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCcCc" as Hash,
};

/**
 * Get the active configuration based on environment
 * Development = local Anvil, Production = Sepolia testnet
 */
export const config = _config.isDevelopment ? _config.local : _config.sepolia;
