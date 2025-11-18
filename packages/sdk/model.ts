import type { Hash } from "viem";
import type { ContractClient } from "./contract";

export class ModelAPI {
	constructor(private contracts: ContractClient) {}

	async get(weightHash: Hash) {
		return await this.contracts.getModelByHash(weightHash);
	}

	async list() {
		return await this.contracts.getModels();
	}

	async getIdFromHash(weightHash: Hash): Promise<bigint> {
		return await this.contracts.getModelIdByHash(weightHash);
	}
}
