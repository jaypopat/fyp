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
		contractAddress: "0x7584c0472a52b9f121f1f8f522a7191a5650a2b8",
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
