/** biome-ignore-all lint/style/noUnusedTemplateLiteral: theyre all just debug logs */

import type { TypeOf } from "@drizzle-team/brocli";
import { SDK } from "@zkfair/sdk";
import path from "path";
import type {
	commitOptions,
	getModelOptions,
	getProofStatusOptions,
	proveModelBiasOptions,
	verifyProofOptions,
} from "./cli-args";

import {
	computeFileHash,
	modelStatusToString,
	validateHexHash,
	withSpinner,
} from "./utils";
import type { FairnessFile } from "../../packages/sdk/artifacts";

export type GetModelOpts = TypeOf<typeof getModelOptions>;
export type ProveModelBiasOpts = TypeOf<typeof proveModelBiasOptions>;
export type GetProofStatusOpts = TypeOf<typeof getProofStatusOptions>;
export type VerifyProofOpts = TypeOf<typeof verifyProofOptions>;
export type CommitOpts = TypeOf<typeof commitOptions>;

const zkFairSDK = new SDK({
	rpcUrl: process.env.RPC_URL,
	privateKey: process.env.PRIVATE_KEY || "",
	contractAddress: process.env.CONTRACT_ADDRESS || "",
});

/**
 * Registers a new model if it doesn't already exist.
 * Returns tx hash.
 */
async function registerModel(params: {
	weightsPath: string;
	datasetPath: string;
	fairnessThresholdPath: string;
	schema: {
		hashAlgo: "SHA-256" | "BLAKE2b";
		encodingAlgo: "JSON" | "MSGPACK";
	};
	modelMetadata: {
		name: string;
		description: string;
		creator?: string;
	};
}): Promise<`0x${string}`> {
	console.log("🚀 Registering new model...");

	const absWeightsPath = path.resolve(params.weightsPath);
	const absDatasetPath = path.resolve(params.datasetPath);
	const absFairnessThresholdPath = path.resolve(params.fairnessThresholdPath);

	const txHash = await withSpinner(
		"Reading model weights file",
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

      const fairnessConfig = await Bun.file(absFairnessThresholdPath).json() as FairnessFile;

			return await withSpinner(
				"Submitting commitment to blockchain",
				async () =>
					await zkFairSDK.commit.makeCommitment(
						absDatasetPath,
						absWeightsPath,
						{
							model: {
								name: params.modelMetadata.name ?? "",
								description: params.modelMetadata.description ?? "",
								creator: params.modelMetadata.creator ?? "",
							},
							schema: {
								cryptoAlgo: params.schema.hashAlgo,
								encodingSchema: params.schema.encodingAlgo,
							},
							fairness: {
								metric: fairnessConfig.metric || "demographic_parity",
								targetDisparity: fairnessConfig.targetDisparity || 0.05,
								protectedAttribute:
									fairnessConfig.protectedAttribute || "unknown",
							},
						},
					),
				"Commitment transaction submitted",
			);
		},
		"Weights file read successfully",
	);

	console.log(`\n✅ Model Registration Successful!`);
	console.log(`   Transaction Hash: ${txHash}`);
	console.log(`   Name: ${params.modelMetadata.name || "Unnamed Model"}`);
	return txHash;
}

export async function proveModelBias(opts: ProveModelBiasOpts) {
	console.log("🔬 Starting model fairness proof process...");
	console.log(`   Weights: ${opts.weights}`);
	console.log(`   Dataset: ${opts.data}`);
	console.log(`   Protected Attributes: ${opts.attributes}`);

	await registerModel({
		weightsPath: opts.weights,
		datasetPath: opts.data,
		fairnessThresholdPath: opts.fairnessThreshold,
		schema: {
			encodingAlgo: opts.encoding,
			hashAlgo: opts.crypto,
		},
		modelMetadata: {
			name: opts.name,
			description: opts.description,
			creator: opts.creator,
		},
	});

	console.log(`\n🎯 Fairness Proof Process Complete!`);
	console.log(`   Next steps: Generate ZK proof and submit for verification`);

	// generate a proof offchain

	//let proof = zkFairSDK.proof.generateProof(opts.model, opts.data, opts.attribute);
	// zkFairSDK.proof.submitProof(proof);

	// let res = await zkFairSDK.verify.verifyProof(proof, publicInputs);
	// if (res) {
	//   console.log(`\n Fairness Proof Process Complete!`);
	// }
	// else {
	//   console.log(`\n Your proof was not valid!`);
	// }
}

export async function commit(opts: CommitOpts) {
	console.log("📦 Committing model and dataset...");
	console.log(`   Weights: ${opts.weights}`);
	console.log(`   Dataset: ${opts.data}`);

	const txHash = await registerModel({
		weightsPath: opts.weights,
		fairnessThresholdPath: opts.fairnessThreshold,
		datasetPath: opts.data,
		schema: {
			encodingAlgo: opts.encoding,
			hashAlgo: opts.crypto,
		},
		modelMetadata: {
			name: opts.name,
			description: opts.description,
			creator: opts.creator,
		},
	});

	console.log(`\n✅ Commitment Complete!`);
	return txHash;
}

export async function getProofStatus(options: GetProofStatusOpts) {
	if (!options.proofHash && !options.weights) {
		throw new Error("Missing required option: pass --proofHash or --weights");
	}

	const result = await withSpinner(
		"Getting proof status",
		async () => {
			let weightsHash: `0x${string}`;
			if (options.proofHash) {
				weightsHash = validateHexHash(options.proofHash);
			} else {
				if (!options.weights)
					throw new Error("Provide --weights or --proofHash");
				weightsHash = await computeFileHash(options.weights);
			}

			console.log(`Checking proof status for weights hash: ${weightsHash}`);

			const status = await zkFairSDK.proof.getStatus?.(weightsHash);
			return { status, weightsHash };
		},
		"Proof status retrieved",
	);

	console.log(`\n📊 Proof Status Results:`);
	console.log(`   Weights Hash: ${result.weightsHash}`);
	console.log(`   Status: ${result.status}`);

	return result.status;
}

export async function verifyProof(options: VerifyProofOpts) {
	const publicInputs: string[] = options.publicInputs.split(",");

	let hashToVerify: `0x${string}`;
	if (options.proofHash) {
		hashToVerify = validateHexHash(options.proofHash);
		console.log(`Using provided proof hash: ${hashToVerify}`);
	} else if (options.weights) {
		hashToVerify = await computeFileHash(options.weights);
		console.log(`Computed weights hash from weights file: ${hashToVerify}`);
	} else {
		throw new Error("Must provide either weights file or proof hash.");
	}

	console.log(`🔐 Starting proof verification...`);
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

	console.log(`\n✅ Proof Verification Successful!`);
	console.log(
		`   The submitted proof is valid and the model meets fairness constraints.`,
	);
}

export async function listModels() {
	console.log("📋 Fetching all registered models...");

	const models = await withSpinner(
		"Loading models",
		async () => {
			return await zkFairSDK.model.list();
		},
		"Models loaded successfully",
	);

	console.log(`\n📊 Found ${models.length} registered models:`);
	console.log("==========================================");

	if (models.length === 0) {
		console.log("   No models registered yet.");
	} else {
		models.forEach((model, index: number) => {
			console.log(`\n${index + 1}. ${model.name || "Unnamed Model"}`);
			console.log(`   Author: ${model.author}`);
			console.log(`   Status: ${modelStatusToString(model.status)}`);
			console.log(`   Hash: ${model.weightsHash}`);
			if (model.description) {
				console.log(`   Description: ${model.description}`);
			}
			console.log(
				`   Registered: ${new Date(Number(model.registrationTimestamp) * 1000).toLocaleString()}`,
			);
		});
	}

	return models;
}

export async function getModel(options: GetModelOpts) {
	let hashToUse: `0x${string}`;

	if (options.modelHash && options.weightsFile) {
		throw new Error("Provide either model hash or weights file, not both");
	}
	if (!options.modelHash && !options.weightsFile) {
		throw new Error("Must provide either model hash or weights file path");
	}
	if (options.modelHash) {
		hashToUse = validateHexHash(options.modelHash);
		console.log(`🔍 Using provided model hash: ${hashToUse}`);
	} else {
		if (!options.weightsFile) throw new Error("weightsFile path missing");
		hashToUse = await computeFileHash(options.weightsFile);
		console.log(`🔍 Computed hash from weights file: ${hashToUse}`);
	}

	const model = await withSpinner(
		"Fetching model details",
		async () => {
			return await zkFairSDK.model.get(hashToUse);
		},
		"Model details retrieved",
	);

	console.log(`\n📋 Model Details:`);
	console.log("================");
	console.log(`Name: ${model.name}`);
	console.log(`Author: ${model.author}`);
	console.log(`Description: ${model.description || "No description"}`);
	console.log(`Status: ${modelStatusToString(model.status)}`);
	console.log(`Weights Hash: ${model.weightsHash}`);
	console.log(`Dataset Merkle Root: ${model.datasetMerkleRoot}`);
	console.log(
		`Registration Time: ${new Date(Number(model.registrationTimestamp) * 1000).toLocaleString()}`,
	);

	if (model.verificationTimestamp && Number(model.verificationTimestamp) > 0) {
		console.log(
			`Verification Time: ${new Date(Number(model.verificationTimestamp) * 1000).toLocaleString()}`,
		);
	}

	if (
		model.proofHash &&
		model.proofHash !==
			"0x0000000000000000000000000000000000000000000000000000000000000000"
	) {
		console.log(`Proof Hash: ${model.proofHash}`);
	}

	return model;
}
