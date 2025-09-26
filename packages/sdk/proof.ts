import type { ContractClient } from "./client";

export class ProofAPI {
	constructor(private contracts: ContractClient) {}

	async proveBias() {
		const config_file_content = await Bun.file("config.json").json();
		const salts = config_file_content.salts;

		// TODO: generate proof using dataset,salts,weights
	}
	async getStatus(weightsHash: `0x${string}`) {
		try {
			const status = await this.contracts.getProofStatus(weightsHash);
			return status;
		} catch (error) {
			console.error("Error fetching proof status:", error);
			throw new Error("Failed to retrieve proof status from contract");
		}
	}
}
