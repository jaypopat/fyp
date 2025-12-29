import type { Hash } from "viem";
import type { ContractClient } from "./contract";

export class ModelAPI {
	constructor(private contracts: ContractClient) {}

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
