/**
 * Internal types for cross-file usage within SDK package
 * External consumers should use "@zkfair/sdk/types" instead
 */
import type { GetEventArgs, Hash, Hex } from "viem";
import type { Chain } from "viem/chains";
import type { Environment } from "./config";

/**
 * SDK initialization options - minimal by design
 * SDK manages infrastructure (addresses, RPCs) internally based on environment
 */
export type ZkFairOptions = {
	/**
	 * Private key for signing transactions (optional for read-only operations)
	 */
	privateKey?: Hex;

	/**
	 * Environment to use (auto-detected from NODE_ENV/ZKFAIR_ENV if not provided)
	 * 'local' = anvil localhost, 'sepolia' = testnet
	 */
	environment?: Environment;
};
export type CommitOptions = {
	model: {
		name: string;
		description: string;
		creator: string;
		inferenceUrl: string;
	};
};

export type ExtractAllEventArgs<
	TAbi extends readonly unknown[],
	TEventName extends string,
> = GetEventArgs<
	TAbi,
	TEventName,
	{ EnableUnion: false; IndexedOnly: false; Required: true }
>;
