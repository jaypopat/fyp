import type { Hash } from "viem";
import type { ContractClient } from "./client";

export class ModelAPI {
	constructor(private contracts: ContractClient) {}

	async get(weightHash: Hash) {
		return await this.contracts.getModelByHash(weightHash);
	}

	async list() {
		return await this.contracts.getModels();
	}
}
