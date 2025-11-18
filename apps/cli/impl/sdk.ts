import { SDK } from "@zkfair/sdk";
import type { Hash, Hex } from "viem";

const isOnChain = process.env.ONCHAIN === "true";

export const zkFairSDK = new SDK({
	rpcUrl:
		(isOnChain ? process.env.ONCHAIN_RPC_URL : process.env.RPC_URL) ||
		"http://localhost:8545",
	contractAddress:
		((isOnChain
			? (process.env.ONCHAIN_CONTRACT_ADDRESS as Hash)
			: process.env.CONTRACT_ADDRESS) as Hash) || "",
	privateKey:
		(isOnChain
			? (process.env.ONCHAIN_PRIVATE_KEY as Hex)
			: (process.env.PRIVATE_KEY as Hex)) || "",
	attestationServiceUrl:
		(isOnChain
			? process.env.ONCHAIN_ATTESTATION_SERVICE_URL
			: process.env.ATTESTATION_SERVICE_URL) || "http://localhost:3000",
});
