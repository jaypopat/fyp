import type { Hex } from "viem";
import { db } from "./db";

export type WebPredictParams = {
	providerUrl: string;
	modelHash: string; // Contract weightsHash
	input: number[];
};

export type Receipt = {
	seqNum: number;
	modelId: number;
	features: number[];
	sensitiveAttr: number;
	prediction: number;
	timestamp: number;
	dataHash: Hex;
	featuresHash: Hex; // For on-chain disputes
	providerSignature: Hex;
};

export type PredictResult = {
	modelId: number;
	prediction: number;
	timestamp: number;
	receipt: Receipt;
};

export async function predict(
	params: WebPredictParams,
): Promise<PredictResult> {
	const res = await fetch(`${params.providerUrl}/predict`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			modelHash: params.modelHash,
			input: params.input,
		}),
	});

	if (!res.ok) {
		throw new Error(`Provider error: ${res.status} ${res.statusText}`);
	}

	const data = (await res.json()) as PredictResult;

	// Save receipt to local Sentinel DB
	await db.receipts.add({
		seqNum: data.receipt.seqNum,
		modelId: data.receipt.modelId,
		timestamp: data.receipt.timestamp,
		providerUrl: params.providerUrl,
		features: data.receipt.features,
		sensitiveAttr: data.receipt.sensitiveAttr,
		prediction: data.receipt.prediction,
		dataHash: data.receipt.dataHash,
		featuresHash: data.receipt.featuresHash,
		providerSignature: data.receipt.providerSignature,
		status: "PENDING", // Will be updated when batch is committed
	});

	return data;
}
