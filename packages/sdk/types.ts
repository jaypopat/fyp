import type { Chain } from "viem/chains";

export type ZkFairOptions = {
	rpcUrl: string;
	network?: "local" | "sepolia" | "custom";
	contractAddress?: string; // optional contract address
	privateKey?: string; // optional private key
	chain?: Chain;
};
export type CommitOptions = {
	model: {
		name: string;
		version: string;
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
