import type { TypeOf } from "@drizzle-team/brocli";
import { confirm } from "@inquirer/prompts";
import path from "path";
import type { Hash } from "viem";
import type { commitOptions, proveModelBiasOptions } from "../cli-args";
import { discoverModelFiles, withSpinner } from "../utils";
import { zkFairSDK } from "./sdk";

export type CommitOpts = TypeOf<typeof commitOptions>;
export type ProveModelBiasOpts = TypeOf<typeof proveModelBiasOptions>;

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
	};
}): Promise<Hash> {
	console.log("🚀 Registering new model...");

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
							},
						},
					),
				"Commitment transaction submitted",
			);
		},
		"Model files read successfully",
	);

	console.log("\n✅ Model Registration Successful!");
	console.log(`   Transaction Hash: ${txHash}`);
	console.log(`   Name: ${params.modelMetadata.name || "Unnamed Model"}`);
	return txHash;
}

export async function commit(opts: CommitOpts) {
	console.log("📦 Committing model and dataset...");

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
		console.log("\n❌ Commitment cancelled.");
		process.exit(0);
	}

	const txHash = await registerModel({
		weightsPath: modelFiles.weightsPath,
		fairnessThresholdPath: modelFiles.fairnessThresholdPath,
		datasetPath: modelFiles.datasetPath,
		modelMetadata: modelFiles.modelMetadata,
	});

	console.log("\n✅ Commitment Complete!");
	return txHash;
}

export async function proveModelBias(opts: ProveModelBiasOpts) {
	console.log("🔬 Starting model fairness proof process...");

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

	await registerModel({
		weightsPath: modelFiles.weightsPath,
		datasetPath: modelFiles.datasetPath,
		fairnessThresholdPath: modelFiles.fairnessThresholdPath,
		modelMetadata: modelFiles.modelMetadata,
	});

	console.log("\n🎯 Fairness Proof Process Complete!");
	console.log("   Next steps: Generate ZK proof and submit for verification");
}
