import { ContractClient } from "./client";

export class ModelAPI {
  constructor(private contracts: ContractClient) { }

  async get(modelId: bigint) {
    return await this.contracts.getModel(modelId);
  }

  async list() {
    return await this.contracts.getModels();
  }
}
