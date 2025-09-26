import type { ContractClient } from "./client";

export class ModelAPI {
	constructor(private contracts: ContractClient) {}

	async get(weightHash: `0x${string}`) {
		return await this.contracts.getModelByHash(weightHash);
	}

	async list() {
		return await this.contracts.getModels();
	}
}
