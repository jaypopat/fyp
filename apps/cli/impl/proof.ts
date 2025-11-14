import type { TypeOf } from "@drizzle-team/brocli";
import { input as promptInput, select } from "@inquirer/prompts";
import type { Hash } from "viem";
import type { getProofStatusOptions, verifyProofOptions } from "../cli-args";
import { modelStatusToString, validateHash, withSpinner } from "../utils";
import { zkFairSDK } from "./sdk";

export type GetProofStatusOpts = TypeOf<typeof getProofStatusOptions>;
export type VerifyProofOpts = TypeOf<typeof verifyProofOptions>;

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

export async function verifyProof(options: VerifyProofOpts) {
	// Step 1: Get proof hash
	let hashToVerify: Hash;
	if (options.proofHash) {
		hashToVerify = validateHash(options.proofHash);
		console.log(`Using provided proof hash: ${hashToVerify}`);
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

		// Filter to only show models with proofs
		const modelsWithProofs = models.filter(
			(m) =>
				m.certificationProofHash &&
				m.certificationProofHash !==
					"0x0000000000000000000000000000000000000000000000000000000000000000",
		);

		if (modelsWithProofs.length === 0) {
			console.log("\n  No models with proofs found.");
			console.log("Available models (without proofs):");
			for (const m of models) {
				console.log(`  - ${m.name || "Unnamed"}`);
			}
			throw new Error(
				"No models with certification proofs. Use 'zkfair proof prove-model-bias' to generate proofs.",
			);
		}

		const selectedHash = await select({
			message: "Select a model to verify proof:",
			choices: modelsWithProofs.map((model) => ({
				name: `${model.name || "Unnamed"} (${modelStatusToString(model.status)})`,
				value: model.weightsHash,
				description: `Proof: ${model.certificationProofHash?.slice(0, 16)}... | Author: ${model.provider.slice(0, 10)}...`,
			})),
		});
		hashToVerify = selectedHash as Hash;
	}

	// Step 2: Get public inputs
	let publicInputs: string[];
	if (options.publicInputs) {
		publicInputs = options.publicInputs.split(",");
	} else {
		const inputStr = await promptInput({
			message: "Enter public inputs (comma-separated):",
			validate: (value: string) => {
				if (!value.trim()) {
					return "Public inputs cannot be empty";
				}
				return true;
			},
		});
		publicInputs = inputStr.split(",");
	}

	console.log(" Starting proof verification...");
	console.log(`   Hash: ${hashToVerify}`);
	console.log(`   Public Inputs: [${publicInputs.join(", ")}]`);
	console.log(`   Mode: ${options.local ? "Local" : "On-chain"}`);

	await withSpinner(
		"Verifying proof",
		async () => {
			await zkFairSDK.verify.verifyProof(hashToVerify, options.local);
		},
		"Proof verified successfully",
	);

	console.log("\n Proof Verification Successful!");
	console.log(
		"   The submitted proof is valid and the model meets fairness constraints.",
	);
}
