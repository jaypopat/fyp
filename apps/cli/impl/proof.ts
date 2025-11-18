import type { TypeOf } from "@drizzle-team/brocli";
import { select } from "@inquirer/prompts";
import { getArtifactDir } from "@zkfair/sdk/utils";
import type { Hash } from "viem";
import type {
	generateProofOptions,
	getProofStatusOptions,
	submitProofOptions,
} from "../cli-args";
import { modelStatusToString, validateHash, withSpinner } from "../utils";
import { zkFairSDK } from "./sdk";

export type GenerateProofOpts = TypeOf<typeof generateProofOptions>;
export type SubmitProofOpts = TypeOf<typeof submitProofOptions>;
export type GetProofStatusOpts = TypeOf<typeof getProofStatusOptions>;

/**
 * Generate ZK proof for a committed model
 */
export async function generateProof(options: GenerateProofOpts) {
	let weightsHash: Hash;

	if (options.weightsHash) {
		weightsHash = validateHash(options.weightsHash);
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
			message: "Select a model to generate proof for:",
			choices: models.map((model) => ({
				name: `${model.name || "Unnamed"} (${modelStatusToString(model.status)})`,
				value: model.weightsHash,
				description: `Hash: ${model.weightsHash.slice(0, 16)}... | Author: ${model.provider.slice(0, 10)}...`,
			})),
		});
		weightsHash = selectedHash as Hash;
	}

	console.log(`\n Generating proof for model: ${weightsHash}`);

	await withSpinner(
		"Generating ZK proof (this may take a while)",
		async () => {
			// Generate proof only (writes proof.json to artifact dir)
			// Ensure artifact dir exists
			const dir = getArtifactDir(weightsHash);
			try {
				await Bun.file(`${dir}/paths.json`).text();
			} catch {
				throw new Error(
					"Artifact directory not found. Run 'zkfair commit' first.",
				);
			}

			await zkFairSDK.proof.generateProof(weightsHash);
		},
		"Proof generated and saved",
	);

	console.log("\n Proof Generation Complete!");
	console.log(`   Weights Hash: ${weightsHash}`);
	console.log(
		"   Next: Run 'zkfair proof submit' to submit the proof on-chain",
	);
}

/**
 * Submit an existing proof to the contract
 */
export async function submitProof(options: SubmitProofOpts) {
	let weightsHash: Hash;

	if (options.weightsHash) {
		weightsHash = validateHash(options.weightsHash);
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
			message: "Select a model to submit proof for:",
			choices: models.map((model) => ({
				name: `${model.name || "Unnamed"} (${modelStatusToString(model.status)})`,
				value: model.weightsHash,
				description: `Hash: ${model.weightsHash.slice(0, 16)}... | Author: ${model.provider.slice(0, 10)}...`,
			})),
		});
		weightsHash = selectedHash as Hash;
	}

	console.log(`\n Submitting proof for model: ${weightsHash}`);

	// Load proof from file
	const dir = getArtifactDir(weightsHash);
	try {
		await Bun.file(`${dir}/proof.json`).text();
	} catch {
		throw new Error("Artifact directory not found. Generate proof first.");
	}

	const proofFile = options.proofFile || `${dir}/proof.json`;
	const proofData = await Bun.file(proofFile).json();

	if (!proofData.attestationHash || !proofData.signature) {
		throw new Error(
			"Invalid proof file. Generate proof first (with attestation).",
		);
	}

	const txHash = await withSpinner(
		"Submitting attestation to contract",
		async () => {
			return await zkFairSDK.proof.submitProof(
				weightsHash,
				proofData.attestationHash as Hash,
				proofData.signature as `0x${string}`,
			);
		},
		"Attestation submitted",
	);

	console.log("\n Proof Submission Complete!");
	console.log(`   Weights Hash: ${weightsHash}`);
	console.log(`   Transaction: ${txHash}`);
}

/**
 * Generate proof and submit in one step
 */
export async function generateAndSubmit(options: GenerateProofOpts) {
	let weightsHash: Hash;

	if (options.weightsHash) {
		weightsHash = validateHash(options.weightsHash);
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
			message: "Select a model to generate and submit proof for:",
			choices: models.map((model) => ({
				name: `${model.name || "Unnamed"} (${modelStatusToString(model.status)})`,
				value: model.weightsHash,
				description: `Hash: ${model.weightsHash.slice(0, 16)}... | Author: ${model.provider.slice(0, 10)}...`,
			})),
		});
		weightsHash = selectedHash as Hash;
	}

	console.log(`\n Generating and submitting proof for model: ${weightsHash}`);

	const txHash = await withSpinner(
		"Generating ZK proof and submitting to contract (this may take a while)",
		async () => zkFairSDK.proof.generateAndSubmitProof(weightsHash),
		"Proof generated and submitted",
	);

	console.log("\n Proof Generation & Submission Complete!");
	console.log(`   Weights Hash: ${weightsHash}`);
	console.log(`   Transaction: ${txHash}`);
}

/**
 * Check proof/certification status for a model
 */
export async function getProofStatus(options: GetProofStatusOpts) {
	let weightsHash: Hash;

	if (options.weightsHash) {
		weightsHash = validateHash(options.weightsHash);
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
			const status = await zkFairSDK.proof.getStatus?.(weightsHash);
			const model = await zkFairSDK.model.get(weightsHash);
			return { status, weightsHash, model };
		},
		"Proof status retrieved",
	);

	console.log("\n Proof Status Results:");
	console.log(`   Model: ${result.model.name}`);
	console.log(`   Weights Hash: ${result.weightsHash}`);
	console.log(`   Status: ${modelStatusToString(result.status)}`);
	console.log(`   Provider: ${result.model.provider}`);

	if (result.status === 0) {
		console.log("\nModel registered but not yet certified");
		console.log(
			"   Next: Run 'zkfair proof generate-and-submit' to certify the model",
		);
	} else if (result.status === 1) {
		console.log("\nModel is certified!");
	}

	return result.status;
}
