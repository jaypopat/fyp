import type { TypeOf } from "@drizzle-team/brocli";
import { select } from "@inquirer/prompts";
import type { Hash } from "viem";
import type { getProofStatusOptions } from "../cli-args";
import { modelStatusToString, validateHash, withSpinner } from "../utils";
import { zkFairSDK } from "./sdk";

export type GetProofStatusOpts = TypeOf<typeof getProofStatusOptions>;

export async function getProofStatus(options: GetProofStatusOpts) {
	let weightsHash: Hash;

	if (options.proofHash) {
		weightsHash = validateHash(options.proofHash);
	} else {
		// Interactive: Select from available models
		const models = await withSpinner(
			"Loading available models",
			async () => {
				return await zkFairSDK.model.list();
			},
			"Models loaded",
		);

		if (models.length === 0) {
			throw new Error("No models registered yet.");
		}

		const selectedHash = await select({
			message: "Select a model to check proof status:",
			choices: models.map((model) => ({
				name: `${model.name || "Unnamed"} (${modelStatusToString(model.status)})`,
				value: model.weightsHash,
				description: `Hash: ${model.weightsHash.slice(0, 16)}... | Author: ${model.provider.slice(0, 10)}...`,
			})),
		});
		weightsHash = selectedHash as Hash;
	}

	const result = await withSpinner(
		"Getting proof status",
		async () => {
			console.log(`Checking proof status for weights hash: ${weightsHash}`);
			const status = await zkFairSDK.proof.getStatus?.(weightsHash);
			return { status, weightsHash };
		},
		"Proof status retrieved",
	);

	console.log("\n Proof Status Results:");
	console.log(`   Weights Hash: ${result.weightsHash}`);
	console.log(`   Status: ${result.status}`);

	return result.status;
}
