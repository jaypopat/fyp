import { UltraHonkBackend } from "@aztec/bb.js";
import { type CompiledCircuit, Noir } from "@noir-lang/noir_js";
import {
	training_circuit,
	type trainingInputType,
} from "@zkfair/zk-circuits/codegen";

import type { Hash } from "viem";
import type { ContractClient } from "./contract";
import { getArtifactDir, parseCSV } from "./utils";

export class ProofAPI {
	constructor(private contracts: ContractClient) {}

	/**
	 * Generate proof and submit certification to contract
	 */
	async generateAndSubmitProof(weightsHash: Hash): Promise<Hash> {
		const dir = getArtifactDir(weightsHash);

		const rawPaths = await Bun.file(`${dir}/paths.json`).json();
		const paths = parsePathsFile(rawPaths);

		// Load dataset & weights
		const weights_data = await Bun.file(paths.weights).arrayBuffer();
		const dataset = await parseCSV(paths.dataset);

		const salts = (await Bun.file(`${dir}/salts.json`).json()) as Record<
			number,
			string
		>;

		const input: trainingInputType = {
			_model_weights: Array.from(new Uint8Array(weights_data)).map(String),
			_dataset_size: String(dataset.length),
			_dataset_features: dataset.flatMap((row) => row.map(String)),
			_dataset_labels: dataset.map((row) => row[14] || "0"), // Assuming label is last column
			_dataset_sensitive_attrs: dataset.map((row) => row[9] || "0"), // Assuming sensitive attr
			_threshold_group_a: "0", // Provide actual values
			_threshold_group_b: "0",
			_dataset_salts: Object.values(salts),
			_weights_hash: weightsHash,
			_dataset_merkle_root: "0", // Provide actual merkle root
			_fairness_threshold_epsilon: "0", // Provide actual epsilon
		};

		const noir = new Noir(training_circuit as CompiledCircuit);
		const { witness } = await noir.execute(input);

		const backend = new UltraHonkBackend(training_circuit.bytecode);
		const proofData = await backend.generateProof(witness);

		const proofHash = `0x${Array.from(proofData.proof)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("")}` as Hash;

		const proofRecord = {
			weightsHash,
			generatedAt: Date.now(),
			proof: proofHash,
			publicInputs: proofData.publicInputs as Hash[],
		};
		await Bun.write(`${dir}/proof.json`, JSON.stringify(proofRecord, null, 2));

		// Submit certification proof directly with weights hash
		const txHash = await this.contracts.submitCertificationProof(
			weightsHash,
			proofHash,
			proofRecord.publicInputs,
		);
		console.log(
			`Certification proof submitted successfully. Tx hash: ${txHash}`,
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
