import { ProviderSDK } from "@zkfair/sdk";
import type { Hex } from "viem";
import { db } from "../db/client";

export const provider = new ProviderSDK({
	privateKey: process.env.PRIVATE_KEY as Hex,
	db,
	batchConfig: {
		batchSize: Number(process.env.BATCH_SIZE) || 100,
		maxBatchAgeMs: Number(process.env.BATCH_MAX_AGE_MS) || 30 * 60 * 1000,
	},
});
