import { ContractClient } from "./client";

export class VerifyAPI {
  constructor(private contracts: ContractClient) { }

  async verifyProof(proofHash: `0x${string}`, publicInputs: string[], local?: boolean) {
    if (local) {
      console.log("Local verification of proof:", proofHash);
      // TODO: bb.js local verification
    } else {
      console.log("Onchain verification of proof:", proofHash);
      // TODO: smart contract verify call
    }
  }
}
