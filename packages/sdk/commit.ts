import type { ContractClient } from "./client";
import type { CommitOptions } from "./types";
import { parseCSV } from "./utils";
import { encode } from "@msgpack/msgpack";

export class CommitAPI {
  constructor(private contracts: ContractClient) { }

  async makeCommitment(
    dataSetPath: string,
    weightsPath: string,
    options: CommitOptions,
  ): Promise<`0x${string}`> {
    const datasetRows = await parseCSV(dataSetPath);
    const weights = await Bun.file(weightsPath).arrayBuffer();

    const { saltsMap, dataSetMerkleRoot, weightsHash } =
      await this.getCommitments(datasetRows, new Uint8Array(weights), {
        encoding: options.schema.encodingSchema,
        hashAlgo: options.schema.cryptoAlgo,
      });

    const hash = await this.contracts.createModelAndCommit(
      options.model.name,
      options.model.description,
      dataSetMerkleRoot,
      weightsHash,
    );

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

    return hash; // tx hash
  }

  private async getCommitments(
    datasetRows: string[][],
    weights: Uint8Array,
    options: {
      encoding: CommitOptions["schema"]["encodingSchema"];
      hashAlgo: CommitOptions["schema"]["cryptoAlgo"];
    },
  ): Promise<{
    saltsMap: Record<number, string>;
    dataSetMerkleRoot: `0x${string}`;
    weightsHash: `0x${string}`;
  }> {
    const saltsMap: Record<number, string> = {};
    const rowHashes: string[] = [];

    for (let i = 0; i < datasetRows.length; i++) {
      const row = datasetRows[i]!;
      const encodedRow = await this.encodeRow(row, options.encoding);
      const salt = this.generateSalt();
      const hashedRow = await this.hashRow(encodedRow, salt, options.hashAlgo);
      saltsMap[i] = salt;
      rowHashes.push(hashedRow);
    }

    const weightsHash = await this.hashWeights(weights);
    const dataSetMerkleRoot = await this.calculateMerkleRoot(rowHashes);

    return {
      saltsMap,
      dataSetMerkleRoot,
      weightsHash,
    };
  }

  private async generateConfigFile(
    filePaths: {
      dataset: string;
      weights: string;
    },
    metadata: CommitOptions["model"],
    schema: CommitOptions["schema"],
    salts: Record<number, string>,
    dataSetMerkleRoot: `0x${string}`,
    weightsHash: `0x${string}`,
    outputPath?: string,
  ) {
    const data = {
      filePaths,
      commitments: { dataSetMerkleRoot, weightsHash },
      metadata,
      schema,
      salts,
    };

    const configPath = outputPath ?? "config.json";
    await Bun.write(configPath, JSON.stringify(data, null, 2));
    console.log(`✅ Config file generated: ${configPath} `);
  }

  private async hashWeights(weightsBuffer: Uint8Array): Promise<`0x${string} `> {
    const hashBuffer = await crypto.subtle.digest("SHA-256", weightsBuffer);
    return this.bufferToHashHex(hashBuffer);
  }

  private async encodeRow(
    row: string[],
    encoding: CommitOptions["schema"]["encodingSchema"],
  ): Promise<Uint8Array> {
    switch (encoding) {
      case "MSGPACK":
        return encode(row);
      case "JSON":
        return new TextEncoder().encode(JSON.stringify(row));
    }
  }

  private generateSalt(length = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private async hashRow(
    row: Uint8Array,
    salt: string,
    hashAlgo?: CommitOptions["schema"]["cryptoAlgo"],
  ): Promise<`0x${string}`> {
    const algo = hashAlgo ?? "SHA-256";

    // combine row bytes + salt bytes
    const saltBytes = new TextEncoder().encode(salt);
    const combined = new Uint8Array(row.length + saltBytes.length);
    combined.set(row, 0);
    combined.set(saltBytes, row.length);

    const hashBuffer = await crypto.subtle.digest(algo, combined);
    return this.bufferToHashHex(hashBuffer);
  }

  private async calculateMerkleRoot(hashes: string[]): Promise<`0x${string}`> {
    if (hashes.length === 0) {
      throw new Error("No hashes provided");
    }

    let level = hashes;

    while (level.length > 1) {
      const nextLevel: string[] = [];

      for (let i = 0; i < level.length; i += 2) {
        const left = level[i]!;
        const right = i + 1 < level.length ? level[i + 1]! : left;

        const combined = new Uint8Array(
          Buffer.from(left, "hex").length + Buffer.from(right, "hex").length,
        );
        combined.set(Buffer.from(left, "hex"), 0);
        combined.set(Buffer.from(right, "hex"), Buffer.from(left, "hex").length);

        const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
        nextLevel.push(
          Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(""),
        );
      }

      level = nextLevel;
    }

    return `0x${level[0]} ` as `0x${string}`;
  }

  private bufferToHashHex(buffer: ArrayBuffer): `0x${string} ` {
    const hashArray = Array.from(new Uint8Array(buffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return `0x${hex} ` as `0x${string} `;
  }
}
