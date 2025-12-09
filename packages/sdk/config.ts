/**
 * SDK Configuration
 * Manages contract addresses, RPC URLs, and attestation service URLs per environment
 * Consumers should only need to pass privateKey (and optionally override specific values)
 */
import type { Hash } from "viem";
import type { Chain } from "viem/chains";
import { anvil, sepolia } from "viem/chains";

export type Environment = "local" | "sepolia";

export type NetworkConfig = {
	contractAddress: Hash;
	rpcUrl: string;
	attestationServiceUrl: string;
	chain: Chain;
	explorerBase: string;
};

type SdkConfig = {
	local: NetworkConfig;
	sepolia: NetworkConfig;
};

const SDK_CONFIG: SdkConfig = {
	local: {
		contractAddress: "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0",
		rpcUrl: "http://localhost:8545",
		attestationServiceUrl: "http://localhost:3000",
		chain: anvil,
		explorerBase: "https://app.tryethernal.com",
	},
	sepolia: {
		contractAddress: "0x7584c0472a52b9f121f1f8f522a7191a5650a2b8",
		rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
		attestationServiceUrl: "https://attestation-api.fyp.jaypopat.me",
		chain: sepolia,
		explorerBase: "https://sepolia.etherscan.io",
	},
};

/**
 * Detect environment from process.env or other heuristics
 * Consumers can override by explicitly passing `environment` option
 */
// Global State to hold the active configuration
let activeEnvironment: Environment | null = null;

/**
 * Detect environment from process.env or other heuristics
 * Used as the FALLBACK if no global config has been explicitly set.
 */
export function detectEnvironment(): Environment {
	// 1. If user explicitly set a global env, return that!
	if (activeEnvironment) {
		return activeEnvironment;
	}

	// 2. Check environment variables (Runtime Detection)
	if (process.env.ZKFAIR_ENV === "sepolia") {
		return "sepolia";
	}
	if (process.env.NODE_ENV === "production") {
		return "sepolia";
	}

	// 3. Default fallback
	return "local";
}

/**
 * Get network config for an environment
 */
export function getNetworkConfig(env: Environment): NetworkConfig {
	return SDK_CONFIG[env];
}

/**
 * Get the default active configuration based on environment detection
 */
export function getDefaultConfig(): NetworkConfig {
	const env = detectEnvironment();
	return getNetworkConfig(env);
}

/**
 * Get all network configurations (useful for consumers like frontends)
 */
export function getAllNetworkConfigs(): SdkConfig {
	return SDK_CONFIG;
}
export function setGlobalConfig(env: Environment) {
	activeEnvironment = env;
}
