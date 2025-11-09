import type { Hex } from "viem";

export type WebPredictParams = {
	providerUrl: string;
	modelId: string | number;
	input: number[];
};

export type Result = {
	modelId: string | number;
	prediction: number;
	timestamp: number;
	inputHash: Hex;
	queryId: string;
};

export async function predict(params: WebPredictParams): Promise<Result> {
	const res = await fetch(`${params.providerUrl}/predict`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			modelId: params.modelId,
			input: params.input,
		}),
	});

	if (!res.ok) {
		throw new Error(`Provider error: ${res.status} ${res.statusText}`);
	}

	const data = (await res.json()) as Result;
	return data;
}
