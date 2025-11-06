import type { TypeOf } from "@drizzle-team/brocli";
import { input as promptInput, select } from "@inquirer/prompts";
import { Client } from "@zkfair/itmac";
import type { Hex } from "viem";
import type { queryModelOptions } from "../cli-args";
import { modelStatusToString, withSpinner } from "../utils";
import { zkFairSDK } from "./sdk";

export type QueryModelOpts = TypeOf<typeof queryModelOptions>;

export async function queryModel(opts: QueryModelOpts) {
	console.log("🔮 Querying model with IT-MAC protocol...");

	// Step 1: Get or prompt for model ID
	let modelId: string;
	if (opts.modelId) {
		modelId = opts.modelId;
	} else {
		// Fetch available models
		const models = await withSpinner(
			"Loading available models",
			async () => {
				return await zkFairSDK.model.list();
			},
			"Models loaded",
		);

		if (models.length === 0) {
			throw new Error("No models available. Please register a model first.");
		}

		// Create interactive selection
		modelId = await select({
			message: "Select a model to query:",
			choices: models.map((model) => ({
				name: `${model.name || "Unnamed"} (${modelStatusToString(model.status)})`,
				value: model.weightsHash,
				description: `Author: ${model.provider.slice(0, 10)}... | Hash: ${model.weightsHash.slice(0, 16)}...`,
			})),
		});
	}

	// Step 2: Get or prompt for input
	let input: number[];
	if (opts.input) {
		input = opts.input.split(",").map((v) => Number.parseFloat(v.trim()));
	} else {
		const inputStr = await promptInput({
			message: "Enter input values (comma-separated numbers):",
			validate: (value: string) => {
				const nums = value
					.split(",")
					.map((v: string) => Number.parseFloat(v.trim()));
				if (nums.some((n: number) => Number.isNaN(n))) {
					return "Please enter valid numbers separated by commas";
				}
				return true;
			},
		});
		input = inputStr.split(",").map((v: string) => Number.parseFloat(v.trim()));
	}

	console.log(`\n   Model ID: ${modelId}`);
	console.log(`   Input: [${input.join(", ")}]`);

	// Generate query ID if not provided
	const queryId = opts.queryId || crypto.randomUUID();
	console.log(`   Query ID: ${queryId}`);

	// Step 3: Generate client commitment
	const { clientRand, clientCommit } = await withSpinner(
		"Generating client commitment",
		async () => Client.generateCommitment(),
		"Commitment generated",
	);

	console.log(`   Client Commit: ${clientCommit.slice(0, 16)}...`);

	// Step 4: Send request to provider
	const url = `${opts.providerUrl.replace(/\/$/, "")}/predict`;
	const requestBody = {
		modelId: modelId,
		input,
		clientCommit,
		clientRand,
		queryId,
	};

	const response = await withSpinner(
		"Sending query to provider",
		async () => {
			const res = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestBody),
			});

			if (!res.ok) {
				const errorText = await res.text();
				throw new Error(
					`Provider error: ${res.status} ${res.statusText}\n${errorText}`,
				);
			}

			return await res.json();
		},
		"Response received",
	);

	const { prediction, itmac } = response as {
		prediction: number;
		itmac: {
			providerRand: Hex;
			coins: Hex;
			transcript: {
				queryId: string;
				modelId: number;
				inputHash: Hex;
				prediction: number;
				timestamp: number;
				coins: Hex;
			};
			bundle: {
				mac: Hex;
				providerSignature: Hex;
			};
			providerPublicKey: Hex;
		};
	};

	console.log(`\n📊 Prediction Result: ${prediction}`);

	// Step 5: Verify IT-MAC bundle
	const macKeyHex = opts.macKey as Hex | undefined;
	const client = new Client(clientRand, itmac.providerPublicKey);

	const verificationResult = await withSpinner(
		"Verifying IT-MAC bundle",
		async () => {
			return client.verifyBundle(itmac.transcript, itmac.bundle, {
				verifyMac: !!macKeyHex,
			});
		},
		"Verification complete",
	);

	console.log("\n✅ IT-MAC Verification:");

	if (!verificationResult.valid) {
		console.log("\n❌ IT-MAC verification FAILED!");
		process.exitCode = 1;
	} else {
		console.log("\n✅ IT-MAC verification PASSED!");
		console.log(
			"   The prediction is cryptographically verified and tamper-proof.",
		);
	}

	return {
		prediction,
		queryId,
		verified: verificationResult.valid,
		verificationResult,
	};
}
