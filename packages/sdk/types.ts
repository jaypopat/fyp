import type { Hash, Hex } from "viem";
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
	};
	schema: {
		encodingSchema: "MSGPACK" | "JSON";
		cryptoAlgo: "BLAKE2b" | "SHA-256";
	};
};
export type hashAlgos = CommitOptions["schema"]["cryptoAlgo"];
export type encodingSchemas = CommitOptions["schema"]["encodingSchema"];
