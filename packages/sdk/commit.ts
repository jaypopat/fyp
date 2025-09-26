import { ContractClient } from "./client";
import type { CommitOptions } from "./types";
import Papa from "papaparse";

export class CommitAPI {
  constructor(private contracts: ContractClient) { }

  async makeCommitment(dataSetPath: string, weights: Uint8Array, options: CommitOptions): Promise<`0x${string}`> {

    // i have a csv dataset, i need to serialise each row with a encoding scheme, eg SCALE..
    // then i need to hash (encoded_row + a random salt)
    // store the salt and row index
    // calculate the merkle root hash of all of the cells togther
    //
    // hash the (weights + a salt), also store the salt
    // we generate a salts.json on the clients local machine

    const datasetRows = await this.parseCSV(dataSetPath);

    let { saltsMap, dataSetMerkleRoot, weightsHash } = await this.getCommitments(datasetRows, weights,
      {
        encoding: options.schema.encodingSchema || 'SCALE',
        hashAlgo: options?.schema.cryptoAlgo || "BLAKE2b"
      }
    );

    let hash = await this.contracts.createModelAndCommit(
      options.model.name,
      options.model.description,
      dataSetMerkleRoot,
      weightsHash
    )
    //
    // write config file
    await this.generateConfigFile(options.model, options.schema, saltsMap, options.outPath);
    // return the tx hash
    return hash;

  }
  private async getCommitments(datasetRows: string[][], weights: Uint8Array, options: { encoding: string, hashAlgo: string }): Promise<{
    saltsMap: Record<number, string>,
    dataSetMerkleRoot: `0x${string}`,
    weightsHash: `0x${string}`
  }> {

    // TODO complete this

    return {
      saltsMap: {},
      dataSetMerkleRoot: "0x123456789",
      weightsHash: "0x123456789"
    }
  }

  private async parseCSV(filePath: string): Promise<string[][]> {
    const csvText = await Bun.file(filePath).text();
    // Parse CSV using PapaParse
    const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
    if (parsed.errors.length) {
      throw new Error("Error parsing CSV: " + parsed.errors.join(", "));
    }

    return parsed.data;
  }
  private async generateConfigFile(metadata: CommitOptions["model"], schema: CommitOptions["schema"], salt: Record<string, string>, path?: string) {
    let data = {
      metadata,
      schema,
      salt
    }
    await Bun.write(path ?? "config.json", JSON.stringify(data));
  }
}
