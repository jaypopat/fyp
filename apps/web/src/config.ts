import type { Hash } from "viem";
import { anvil, sepolia } from "viem/chains";

type NetworkConfig = {
	contractAddress: Hash;
	rpcUrl: string;
	chain: typeof anvil | typeof sepolia;
	providerUrl: string;
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
	},
	sepolia: {
		contractAddress: "0xc8d9688e0a5e96b1cca56d98eae62ce980088537",
		rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
		chain: sepolia,
		providerUrl: "https://zkfair-provider.fly.dev",
	},
	isDevelopment: process.env.NODE_ENV !== "production",
};

/**
 * Get the active configuration based on environment
 * Development = local Anvil, Production = Sepolia testnet
 */
export const config = _config.isDevelopment ? _config.local : _config.sepolia;
