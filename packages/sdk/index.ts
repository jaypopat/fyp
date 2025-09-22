import { ModelAPI } from "./model";
import { ContractClient } from "./client";
import type { ZkFairOptions } from "./types";
import { CommitAPI } from "./commit";
import { ProofAPI } from "./proof";
import { VerifyAPI } from "./verify";

export class SDK {
  public model: ModelAPI;
  public contracts: ContractClient;
  public proof: ProofAPI;
  public commit: CommitAPI;
  public verify: VerifyAPI;

  constructor(options: ZkFairOptions) {
    this.contracts = new ContractClient(options);

    this.model = new ModelAPI(this.contracts);
    this.proof = new ProofAPI(this.contracts);
    this.commit = new CommitAPI(this.contracts);
    this.verify = new VerifyAPI(this.contracts);
  }
}
