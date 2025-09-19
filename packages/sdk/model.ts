import { ContractClient } from "./client";

export class ModelAPI {
  constructor(private contracts: ContractClient) { }

  async get(modelHash: string) {
    return this.contracts.readModel(modelHash);
  }

  async list() {
    return this.contracts.getAllModels();
  }
}
