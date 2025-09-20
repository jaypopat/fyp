import { ContractClient } from "./client";

export class ProofAPI {
  constructor(private contracts: ContractClient) { }

  async proveBias() {
    let config_file_content = await Bun.file("config.json").json();
    let salts = config_file_content.salts;

    // TODO: generate proof using dataset,salts,weights

  }

}
