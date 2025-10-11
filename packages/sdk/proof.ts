import { UltraHonkBackend } from "@aztec/bb.js";
import { type CompiledCircuit, Noir } from "@noir-lang/noir_js";
import circuit from "@zkfair/zk-circuits/circuit";
import type { Hex } from "viem";
import { type FairnessThresholdFile, parsePathsFile } from "./artifacts";
import type { ContractClient } from "./client";
import { getArtifactDir, parseCSV } from "./utils";

export class ProofAPI {
	constructor(private contracts: ContractClient) {}

	async generateProof(weightsHash: Hex): Promise<Hex> {
		const dir = getArtifactDir(weightsHash);

		const rawPaths = await Bun.file(`${dir}/paths.json`).json();
		const paths = parsePathsFile(rawPaths);

		// Load dataset & weights
		const weights_data = await Bun.file(paths.weights).arrayBuffer();
		const dataset = await parseCSV(paths.dataset);
		const threshold = (await Bun.file(
			paths.threshold,
		).json()) as FairnessThresholdFile;

		const salts = (await Bun.file(`${dir}/salts.json`).json()) as Record<
			number,
			string
		>;
		const fairness = (await Bun.file(`${dir}/fairness.json`).json()) as {
			metric: string;
			targetDisparity: number;
			protectedAttribute: string;
		};

		const input = {
			weights: new Uint8Array(weights_data),
			dataset: dataset,
			salts: salts,
			threshold: threshold,
		};

		const noir = new Noir(circuit as CompiledCircuit);
		const { witness } = await noir.execute(input as any); // TODO build the circuit so it takes the input as required

		const backend = new UltraHonkBackend(circuit.bytecode);
		const proofData = await backend.generateProof(witness);

		const proofHex = `0x${Array.from(proofData.proof)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("")}` as Hex;

		const proofRecord = {
			weightsHash,
			generatedAt: Date.now(),
			proof: proofHex,
			publicInputs: proofData.publicInputs as Hex[],
		};
		await Bun.write(`${dir}/proof.json`, JSON.stringify(proofRecord, null, 2));

		return proofHex;
	}
	async getStatus(weightsHash: Hex) {
		try {
			const status = await this.contracts.getProofStatus(weightsHash);
			return status;
		} catch (error) {
			console.error("Error fetching proof status:", error);
			throw new Error("Failed to retrieve proof status from contract");
		}
	}
}
