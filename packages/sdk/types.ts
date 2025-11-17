/**
 * Internal types for cross-file usage within SDK package
 * External consumers should use "@zkfair/sdk/types" instead
 */
import type { GetEventArgs, Hash, Hex } from "viem";
import type { Chain } from "viem/chains";

export type ZkFairOptions = {
	rpcUrl?: string;
	contractAddress: Hash;
	privateKey?: Hex;
	chain?: Chain;
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
