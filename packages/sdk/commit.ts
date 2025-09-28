import type { ContractClient } from "./client";
import type { CommitOptions } from "./types";
import { parseCSV } from "./utils"

export class CommitAPI {
  constructor(private contracts: ContractClient) { }

  async makeCommitment(
    dataSetPath: string,
    weightsPath: string,
    options: CommitOptions,
  ): Promise<`0x${string}`> {

    const datasetRows = await parseCSV(dataSetPath);
    let weights = await Bun.file(weightsPath).arrayBuffer();

    const { saltsMap, dataSetMerkleRoot, weightsHash } =
      await this.getCommitments(datasetRows, new Uint8Array(weights), {
        encoding: options.schema.encodingSchema || "SCALE",
        hashAlgo: options?.schema.cryptoAlgo || "BLAKE2b",
      });

    const hash = await this.contracts.createModelAndCommit(
      options.model.name,
      options.model.description,
      dataSetMerkleRoot,
      weightsHash,
    );
    //
    // write config file
    await this.generateConfigFile(
      {
        dataset: dataSetPath,
        weights: weightsPath,
      },
      options.model,
      options.schema,
      saltsMap,
      dataSetMerkleRoot,
      weightsHash,
      options.outPath,
    );
    // return the tx hash
    return hash;
  }
  private async getCommitments(
    datasetRows: string[][],
    weights: Uint8Array,
    options: { encoding: string; hashAlgo: string },
  ): Promise<{
    saltsMap: Record<number, string>;
    dataSetMerkleRoot: `0x${string}`;
    weightsHash: `0x${string}`;
  }> {
    // TODO complete this
    // // i have a csv dataset, i need to serialise each row with a encoding scheme, eg SCALE..
    // then i need to hash (encoded_row + a random salt)
    // store the salt and row index
    // calculate the merkle root hash of all of the cells togther
    //
    // hash the (weights + a salt), also store the salt
    // we generate a salts.json on the clients local machine

    return {
      saltsMap: {},
      dataSetMerkleRoot: "0x123456789",
      weightsHash: "0x123456789",
    };
  }
  private async generateConfigFile(
    filePaths: {
      dataset: string;
      weights: string;
    },
    metadata: CommitOptions["model"],
    schema: CommitOptions["schema"],
    salts: Record<string, string>,
    dataSetMerkleRoot: `0x${string}`,
    weightsHash: `0x${string}`,
    outputPath?: string,
  ) {
    const data = {
      // Store file paths for proof generation
      filePaths,

      // Store commitment hashes for verification
      commitments: {
        dataSetMerkleRoot,
        weightsHash,
      },

      // Store metadata
      metadata,

      // Store schema information
      schema,

      // Store salts
      salts,

      // Add timestamp
      timestamp: Date.now(),

      // Add version for future compatibility
      version: "1.0.0",
    };

    const configPath = outputPath ?? "config.json";
    await Bun.write(configPath, JSON.stringify(data, null, 2));

    console.log(`✅ Config file generated: ${configPath}`);
  }
}
