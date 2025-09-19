import { ContractClient } from "./client";

export class CommitAPI {
  constructor(private contracts: ContractClient) { }

  async makeCommitment(dataSet: Uint8Array, weights: Uint8Array) {


    // return this.contracts.makeCommitment(
    //   dataSet,
    //   weights,
    // );
  }
}
