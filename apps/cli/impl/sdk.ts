import { SDK } from "@zkfair/sdk";
import type { Hex } from "viem";

export const zkFairSDK = new SDK({
	rpcUrl: process.env.RPC_URL || "http://localhost:8545",
	contractAddress: process.env.CONTRACT_ADDRESS as Hex,
	privateKey: process.env.PRIVATE_KEY as Hex,
});
