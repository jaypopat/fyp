import type { TypeOf } from "@drizzle-team/brocli";
import { select } from "@inquirer/prompts";
import type { Hash } from "viem";
import type { getModelOptions } from "../cli-args";
import { modelStatusToString, validateHash, withSpinner } from "../utils";
import { zkFairSDK } from "./sdk";

export type GetModelOpts = TypeOf<typeof getModelOptions>;

export async function listModels() {
	console.log(" Fetching all registered models...");

	const models = await withSpinner(
		"Loading models",
		async () => {
			return await zkFairSDK.model.list();
		},
		"Models loaded successfully",
	);

	console.log(`\n Found ${models.length} registered models:`);
	console.log("==========================================");

	if (models.length === 0) {
		console.log("   No models registered yet.");
	} else {
		models.forEach((model, index: number) => {
			console.log(`\n${index + 1}. ${model.name || "Unnamed Model"}`);
			console.log(`   Author: ${model.provider}`);
			console.log(`   Status: ${modelStatusToString(model.status)}`);
			console.log(`   Hash: ${model.weightsHash}`);
			if (model.description) {
				console.log(`   Description: ${model.description}`);
			}
			console.log(
				`   Registered: ${new Date(Number(model.verifiedAt) * 1000).toLocaleString()}`,
			);
		});
	}

	return models;
}

export async function getModel(options: GetModelOpts) {
	let hashToUse: Hash;

	if (options.modelHash) {
		hashToUse = validateHash(options.modelHash);
		console.log(` Using provided model hash: ${hashToUse}`);
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
			throw new Error(
				"No models registered yet. Use 'zkfair commit' to register a model.",
			);
		}

		const selectedHash = await select({
			message: "Select a model to view details:",
			choices: models.map((model) => ({
				name: `${model.name || "Unnamed"} (${modelStatusToString(model.status)})`,
				value: model.weightsHash,
				description: `Author: ${model.provider.slice(0, 10)}... | Registered: ${new Date(Number(model.registeredAt) * 1000).toLocaleDateString()}`,
			})),
		});
		hashToUse = selectedHash as Hash;
	}

	const model = await withSpinner(
		"Fetching model details",
		async () => {
			return await zkFairSDK.model.get(hashToUse);
		},
		"Model details retrieved",
	);

	console.log("\n Model Details:");
	console.log("================");
	console.log(`Name: ${model.name}`);
	console.log(`Author: ${model.provider}`);
	console.log(`Description: ${model.description || "No description"}`);
	console.log(`Status: ${modelStatusToString(model.status)}`);
	console.log(`Weights Hash: ${model.weightsHash}`);
	console.log(`Dataset Merkle Root: ${model.datasetMerkleRoot}`);
	console.log(
		`Registration Time: ${new Date(Number(model.registeredAt) * 1000).toLocaleString()}`,
	);

	if (model.verifiedAt && Number(model.verifiedAt) > 0) {
		console.log(
			`Verification Time: ${new Date(Number(model.verifiedAt) * 1000).toLocaleString()}`,
		);
	}

	if (
		model.certificationProofHash &&
		model.certificationProofHash !==
			"0x0000000000000000000000000000000000000000000000000000000000000000"
	) {
		console.log(`Proof Hash: ${model.certificationProofHash}`);
	}

	return model;
}
