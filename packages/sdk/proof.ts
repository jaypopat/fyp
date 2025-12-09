import { UltraHonkBackend } from "@aztec/bb.js";
import { type CompiledCircuit, Noir } from "@noir-lang/noir_js";
import {
	training_circuit,
	type trainingInputType,
} from "@zkfair/zk-circuits/codegen";

import type { Hash } from "viem";
import {
	parseCommitmentsFile,
	parseFairnessThresholdFile,
	parsePathsFile,
} from "./artifacts";
import { getDefaultConfig } from "./config";
import type { ContractClient } from "./contract";
import { getArtifactDir, parseCSV, weightsToFields } from "./utils";

export class ProofAPI {
	private readonly attestationUrl: string;

	constructor(private contracts: ContractClient) {
		// Use provided URL or default from config
		const config = getDefaultConfig();
		console.log(config.attestationServiceUrl);

		this.attestationUrl = config.attestationServiceUrl;
	}

	/**
	 * Generate ZK proof and submit attestation request to service
	 * Returns signed attestation from service
	 */
	async generateProof(weightsHash: Hash): Promise<{
		weightsHash: Hash;
		generatedAt: number;
		proof: `0x${string}`;
		publicInputs: `0x${string}`[];
		attestationHash: Hash;
		signature: `0x${string}`;
	}> {
		const dir = getArtifactDir(weightsHash);

		const rawPaths = await Bun.file(`${dir}/paths.json`).json();
		const paths = parsePathsFile(rawPaths);

		// Load dataset & weights
		const weights_data = await Bun.file(paths.weights).arrayBuffer();
		const weightsFields = await weightsToFields(new Float32Array(weights_data));
		const dataset = await parseCSV(paths.dataset);

		const salts = (await Bun.file(`${dir}/salts.json`).json()) as Record<
			number,
			string
		>;

		const thresholds = parseFairnessThresholdFile(
			await Bun.file(paths.fairnessThreshold).json(),
		);
		const commitments = parseCommitmentsFile(
			await Bun.file(`${dir}/commitments.json`).json(),
		);

		// Load Merkle proofs
		const merkleProofs = (await Bun.file(
			`${dir}/merkle_proofs.json`,
		).json()) as {
			merklePaths: string[][];
			isEvenFlags: boolean[][];
		};

		// Convert hex merkle paths to decimal strings for the circuit
		const merklePathsDecimal = merkleProofs.merklePaths.map((path) =>
			path.map((hex) => {
				const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
				return BigInt(`0x${clean}`).toString();
			}),
		);

		const input: trainingInputType = {
			// private inputs
			_model_weights: weightsFields.map(String),
			_dataset_size: String(dataset.length),
			_dataset_features: dataset.flatMap(
				(row) => row.slice(0, -1).map(String), // Everything except last column
			),
			_dataset_labels: dataset.map((row) => String(row[row.length - 1] ?? "0")),
			_dataset_sensitive_attrs: dataset.map((row) =>
				String(row[thresholds.protectedAttributeIndex] ?? "0"),
			),
			_threshold_group_a: String(thresholds.thresholds.group_a),
			_threshold_group_b: String(thresholds.thresholds.group_b),
			_dataset_salts: Object.values(salts),
			_merkle_paths: merklePathsDecimal,
			_is_even_flags: merkleProofs.isEvenFlags,

			// public inputs
			_weights_hash: weightsHash,
			_dataset_merkle_root: commitments.datasetMerkleRoot,
			_fairness_threshold_epsilon: Math.ceil(
				thresholds.targetDisparity * 100,
			).toString(),
		};

		const noir = new Noir(training_circuit as CompiledCircuit);
		const { witness } = await noir.execute(input);

		const backend = new UltraHonkBackend(training_circuit.bytecode);
		const proofData = await backend.generateProof(witness);

		// Convert proof bytes to hex string
		const proofHex = `0x${Array.from(proofData.proof)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("")}` as `0x${string}`;

		const publicInputsHex = proofData.publicInputs.map(
			(pi) => `0x${Buffer.from(pi).toString("hex")}` as `0x${string}`,
		);

		// Request attestation from service
		console.log(
			`Requesting attestation from ${this.attestationUrl}/attest/training`,
		);
		const attestationResponse = await fetch(
			`${this.attestationUrl}/attest/training`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					proof: proofHex,
					publicInputs: publicInputsHex,
					weightsHash,
				}),
			},
		);

		if (!attestationResponse.ok) {
			const error = (await attestationResponse.json()) as Record<
				string,
				unknown
			>;
			throw new Error(
				`Attestation service error: ${(error.error as string) || attestationResponse.statusText}`,
			);
		}

		const attestation = (await attestationResponse.json()) as Record<
			string,
			unknown
		>;

		const proofRecord = {
			weightsHash,
			generatedAt: Date.now(),
			proof: proofHex,
			publicInputs: publicInputsHex,
			attestationHash: attestation.attestationHash as Hash,
			signature: attestation.signature as `0x${string}`,
		};

		await Bun.write(`${dir}/proof.json`, JSON.stringify(proofRecord, null, 2));

		return proofRecord;
	}

	/**
	 * Submit attestation to the contract
	 */
	async submitProof(
		weightsHash: Hash,
		attestationHash: Hash,
		signature: `0x${string}`,
	): Promise<Hash> {
		const txHash = await this.contracts.submitCertificationProof(
			weightsHash,
			attestationHash,
			signature,
		);
		console.log(
			`Certification attestation submitted successfully. Tx hash: ${txHash}`,
		);
		return txHash;
	}

	/**
	 * Generate proof, get attestation, and submit to contract
	 */
	async generateAndSubmitProof(weightsHash: Hash): Promise<Hash> {
		const proofRecord = await this.generateProof(weightsHash);
		const txHash = await this.submitProof(
			weightsHash,
			proofRecord.attestationHash,
			proofRecord.signature,
		);
		return txHash;
	}

	async getStatus(weightsHash: Hash) {
		try {
			const status = (await this.contracts.getModelByHash(weightsHash)).status;
			return status;
		} catch (error) {
			console.error("Error fetching proof status:", error);
			throw new Error("Failed to retrieve proof status from contract");
		}
	}
}
