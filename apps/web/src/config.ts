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
		contractAddress: "0x5fbdb2315678afecb367f032d93f642f64180aa3",
		rpcUrl: "http://localhost:8545",
		chain: anvil,
		providerUrl: "http://localhost:5000",
		explorerBase: "https://app.tryethernal.com",
	},
	sepolia: {
		contractAddress: "0x85b11d92f2f084f8d019aa1a978a98d65af6f19b",
		rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
		chain: sepolia,
		providerUrl: "https://zkfair-provider.fly.dev",
		explorerBase: "https://sepolia.etherscan.io",
	},
	isDevelopment: process.env.NODE_ENV !== "production",
};

/**
 * Get the active configuration based on environment
 * Development = local Anvil, Production = Sepolia testnet
 */
export const config = _config.isDevelopment ? _config.local : _config.sepolia;
