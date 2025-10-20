import type { Hex } from "viem";
import { createSDK } from "./sdk";

export type WebPredictParams = {
	providerUrl: string;
	modelId: string | number;
	input: number[];
	verifyMac?: boolean;
	providerPubKey?: Hex; // optional, signature-only by default
};

export type Result = {
	modelId: string | number;
	prediction: number;
	timestamp: number;
	inputHash: Hex;
	queryId: string;
	verified: boolean;
	itmac?: { providerRand: Hex; coins: Hex };
};

export async function predict(params: WebPredictParams): Promise<Result> {
	const sdk = createSDK();
	const inference = sdk.initInference(params.providerPubKey);
	return await inference.predict({
		providerUrl: params.providerUrl,
		modelId: params.modelId,
		input: params.input,
		verifyMac: params.verifyMac,
	});
}
