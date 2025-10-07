import type { Chain } from "viem/chains";

export type ZkFairOptions = Partial<{
	rpcUrl: string;
	contractAddress: string;
	privateKey: string;
	chain: Chain;
}>;
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
	fairness: {
		metric: "demographic_parity" | "equalized_odds";
		targetDisparity: number;
		protectedAttribute: string;
	};
};
export type hashAlgos = CommitOptions["schema"]["cryptoAlgo"];
export type encodingSchemas = CommitOptions["schema"]["encodingSchema"];
