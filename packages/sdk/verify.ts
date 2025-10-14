import { UltraHonkBackend } from "@aztec/bb.js";
import circuit from "@zkfair/zk-circuits/circuit";
import type { Hash } from "viem";
import { parseCommitmentsFile, parseProofFile } from "./artifacts";
import type { ContractClient } from "./contract";
import { getArtifactDir, hexToBytes } from "./utils";

export class VerifyAPI {
	constructor(private contracts: ContractClient) {}

	async verifyProof(weightsHash: Hash, local?: boolean): Promise<boolean> {
		const dir = getArtifactDir(weightsHash);
		const [rawProof, rawCommitments] = await Promise.all([
			Bun.file(`${dir}/proof.json`)
				.json()
				.catch(() => {
					throw new Error(
						`Missing proof.json in ${dir}. Run proof generation first.`,
					);
				}),
			Bun.file(`${dir}/commitments.json`).json(),
		]);
		const proofFile = parseProofFile(rawProof);
		const commitments = parseCommitmentsFile(rawCommitments);

		if (local) {
			console.log("Local verification of proof:");
			const proofBytes = hexToBytes(proofFile.proof);
			const backend = new UltraHonkBackend(circuit.bytecode);

			const isValid = await backend.verifyProof({
				proof: proofBytes,
				publicInputs: proofFile.publicInputs,
			});
			console.log(
				isValid ? "Proof is mathematically sound" : "Proof verification failed",
			);
			return isValid;
		}

		console.log("Onchain verification of proof:");
		const isValid = await this.contracts.verifyModel(
			commitments.weightsHash,
			proofFile.proof,
			proofFile.publicInputs,
		);
		console.log(
			`✅ On-chain verification result: ${isValid ? "VALID" : "INVALID"}`,
		);
		return isValid;
	}
}
