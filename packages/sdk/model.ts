import type { Hash } from "viem";
import type { ContractClient } from "./contract";

export class ModelAPI {
	constructor(private contracts: ContractClient) {}

	// use if you know what youre doing, else use the commit api with your files and we process (hash + publish onchain) your files
	// im using this method in some scripts for internal use
	async register(
		name: string,
		description: string,
		inferenceUrl: string,
		weightsHash: Hash,
		datasetMerkleRoot: Hash,
		fairnessThreshold: number,
	) {
		return this.contracts.registerModel(
			name,
			description,
			inferenceUrl,
			weightsHash,
			datasetMerkleRoot,
			fairnessThreshold,
		);
	}

	async get(weightHash: Hash) {
		return await this.contracts.getModelByHash(weightHash);
	}

	async getById(modelId: bigint) {
		return await this.contracts.getModel(modelId);
	}

	async list() {
		return await this.contracts.getModels();
	}

	async getIdFromHash(weightHash: Hash): Promise<bigint> {
		return await this.contracts.getModelIdByHash(weightHash);
	}
}
