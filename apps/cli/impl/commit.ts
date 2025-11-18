import path from "node:path";
import type { TypeOf } from "@drizzle-team/brocli";
import { confirm } from "@inquirer/prompts";
import type { Hash } from "viem";
import type { commitOptions, e2eOptions } from "../cli-args";
import { discoverModelFiles, withSpinner } from "../utils";
import { zkFairSDK } from "./sdk";

export type CommitOpts = TypeOf<typeof commitOptions>;
export type E2EOpts = TypeOf<typeof e2eOptions>;

/**
 * Registers a new model if it doesn't already exist.
 * Returns tx hash.
 */
async function registerModel(params: {
	weightsPath: string;
	datasetPath: string;
	fairnessThresholdPath: string;
	modelMetadata: {
		name: string;
		description: string;
		creator?: string;
		inferenceUrl: string;
	};
}): Promise<Hash> {
	console.log(" Registering new model...");

	const absWeightsPath = path.resolve(params.weightsPath);
	const absDatasetPath = path.resolve(params.datasetPath);
	const absFairnessThresholdPath = path.resolve(params.fairnessThresholdPath);

	const txHash = await withSpinner(
		"Reading model files",
		async () => {
			if (!(await Bun.file(absWeightsPath).exists())) {
				throw new Error(`Model file not found: ${absWeightsPath}`);
			}
			if (!(await Bun.file(absDatasetPath).exists())) {
				throw new Error(`Dataset file not found: ${absDatasetPath}`);
			}
			if (!(await Bun.file(absFairnessThresholdPath).exists())) {
				throw new Error(
					`Fairness threshold file not found: ${absFairnessThresholdPath}`,
				);
			}

			return await withSpinner(
				"Submitting commitment to blockchain",
				async () =>
					await zkFairSDK.commit.makeCommitment(
						absDatasetPath,
						absWeightsPath,
						absFairnessThresholdPath,
						{
							model: {
								name: params.modelMetadata.name ?? "",
								description: params.modelMetadata.description ?? "",
								creator: params.modelMetadata.creator ?? "",
								inferenceUrl: params.modelMetadata.inferenceUrl,
							},
						},
					),
				"Commitment transaction submitted",
			);
		},
		"Model files read successfully",
	);

	console.log("\n Model Registration Successful!");
	console.log(`   Transaction Hash: ${txHash}`);
	console.log(`   Name: ${params.modelMetadata.name || "Unnamed Model"}`);
	return txHash;
}

export async function commit(opts: CommitOpts) {
	console.log(" Committing model and dataset...");

	const modelFiles = await discoverModelFiles({
		dir: opts.dir,
		weights: opts.weights,
		data: opts.data,
		fairnessThreshold: opts.fairnessThreshold,
		name: opts.name,
		description: opts.description,
		creator: opts.creator,
	});

	console.log(`   Weights: ${modelFiles.weightsPath}`);
	console.log(`   Dataset: ${modelFiles.datasetPath}`);
	console.log(`   Fairness Threshold: ${modelFiles.fairnessThresholdPath}`);
	console.log(`\n   Model Name: ${modelFiles.modelMetadata.name}`);
	console.log(`   Description: ${modelFiles.modelMetadata.description}`);
	console.log(
		`   Creator: ${modelFiles.modelMetadata.creator || "Not specified"}`,
	);
	console.log("\n   Encoding: JSON (standard)");
	console.log("   Hash Algorithm: Poseidon (ZK-friendly)");

	// Confirmation prompt for blockchain transaction
	const confirmed = await confirm({
		message:
			"This will submit a blockchain transaction (gas fees apply). Continue?",
		default: true,
	});

	if (!confirmed) {
		console.log("\n Commitment cancelled.");
		process.exit(0);
	}

	const txHash = await registerModel({
		weightsPath: modelFiles.weightsPath,
		fairnessThresholdPath: modelFiles.fairnessThresholdPath,
		datasetPath: modelFiles.datasetPath,
		modelMetadata: modelFiles.modelMetadata,
	});

	console.log("\n Commitment Complete!");
	return txHash;
}

/**
 * End-to-end demo: Register model, generate proof, and submit
 * (formerly prove-model-bias)
 */
export async function e2e(opts: E2EOpts) {
	console.log(" Starting end-to-end model registration & proof process...");

	const modelFiles = await discoverModelFiles({
		dir: opts.dir,
		weights: opts.weights,
		data: opts.data,
		fairnessThreshold: opts.fairnessThreshold,
		name: opts.name,
		description: opts.description,
		creator: opts.creator,
	});

	console.log(`   Weights: ${modelFiles.weightsPath}`);
	console.log(`   Dataset: ${modelFiles.datasetPath}`);

	// Step 1: Register model
	console.log("\n Step 1: Registering model...");
	await registerModel({
		weightsPath: modelFiles.weightsPath,
		datasetPath: modelFiles.datasetPath,
		fairnessThresholdPath: modelFiles.fairnessThresholdPath,
		modelMetadata: modelFiles.modelMetadata,
	});

	// Step 2: Generate and submit proof
	console.log("\n Step 2: Generating and submitting proof...");
	const weightsData = await Bun.file(modelFiles.weightsPath).arrayBuffer();
	const weightsFloat32 = new Float32Array(weightsData);

	// Hash weights using the same method as commit
	const { weightsToFields, hashPoseidonFields } = await import(
		"@zkfair/sdk/utils"
	);
	const weightsFields = await weightsToFields(weightsFloat32);
	const weightsHashStr = hashPoseidonFields(weightsFields);
	const weightsHash = `0x${weightsHashStr}` as Hash;

	await zkFairSDK.proof.generateAndSubmitProof(weightsHash);

	console.log("\n End-to-End Process Complete!");
	console.log("   Model registered and proof submitted for verification");
}
