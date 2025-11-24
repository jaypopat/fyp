import { SDK } from "@zkfair/sdk";
import type { Hex } from "viem";

export const zkFairSDK = new SDK({
	privateKey: process.env.PRIVATE_KEY as Hex,
	// override environment if needed
	// environment: "local" | "sepolia"
});
