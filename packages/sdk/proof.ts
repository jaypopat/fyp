import { UltraHonkBackend } from "@aztec/bb.js";
import { type CompiledCircuit, Noir } from "@noir-lang/noir_js";
import {
	training_circuit,
	type trainingInputType,
} from "@zkfair/zk-circuits/codegen";

import type { Hash, Hex } from "viem";
import {
	parseCommitmentsFile,
	parseFairnessThresholdFile,
	parsePathsFile,
} from "./artifacts";
import type { ContractClient } from "./contract";
import { getArtifactDir, parseCSV, weightsToFields } from "./utils";

export class ProofAPI {
	constructor(
		private contracts: ContractClient,
		private attestationServiceUrl = "http://localhost:3000",
	) {}

	/**
	 * Generate ZK proof (write proof.json to artifact dir) and return the proof record
	 */
	async generateProof(weightsHash: Hash): Promise<{
		weightsHash: Hash;
		generatedAt: number;
		proof: Hash;
		publicInputs: Hash[];
		attestationHash: Hash;
		signature: Hex;
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

		const proofHash = `0x${Array.from(proofData.proof)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("")}` as Hash;

		// Request attestation from training attestation service
		const attestationResponse = await fetch(
			`${this.attestationServiceUrl}/attest/training`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					proof: proofHash,
					publicInputs: proofData.publicInputs,
					weightsHash,
				}),
			},
		);

		if (!attestationResponse.ok) {
			throw new Error(
				`Attestation service error: ${attestationResponse.status} ${attestationResponse.statusText}`,
			);
		}

		const attestation = (await attestationResponse.json()) as {
			attestationHash: Hash;
			signature: Hex;
			passed: boolean;
		};

		const proofRecord = {
			weightsHash,
			generatedAt: Date.now(),
			proof: proofHash,
			publicInputs: proofData.publicInputs as Hash[],
			attestationHash: attestation.attestationHash,
			signature: attestation.signature,
		};
		await Bun.write(`${dir}/proof.json`, JSON.stringify(proofRecord, null, 2));

		return proofRecord;
	}

	/**
	 * Submit a generated proof to the contract
	 */
	async submitProof(
		weightsHash: Hash,
		attestationHash: Hash,
		signature: Hex,
	): Promise<Hash> {
		const txHash = await this.contracts.submitCertificationProof(
			weightsHash,
			attestationHash,
			signature,
		);
		return txHash;
	}

	/**
	 * Generate proof and submit certification to contract
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
