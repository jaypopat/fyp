import { encode } from "@msgpack/msgpack";
import type { ContractClient } from "./client";
import { merkleRoot } from "./merkle";
import type { CommitOptions, encodingSchemas, hashAlgos } from "./types";
import { ensureArtifactDir, hashBytes, parseCSV } from "./utils";

export class CommitAPI {
	constructor(private contracts: ContractClient) {}

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

		// Attempt to register the model - if it already exists, provide a clear error
		let hash: `0x${string}`;
		try {
			hash = await this.contracts.createModelAndCommit(
				options.model.name,
				options.model.description,
				dataSetMerkleRoot,
				weightsHash,
			);
		} catch (err) {
			// Check if this is the "model already exists" error from the contract
			if (
				err instanceof Error &&
				err.message.includes("ZKFair__ModelAlreadyExists")
			) {
				throw new Error(
					`Model with weights hash ${weightsHash} is already registered. Use a different model or check existing commitments.`,
				);
			}
			// Re-throw any other error
			throw err;
		}

		// write config files
		await this.generateConfigDirectory(
			{ dataset: dataSetPath, weights: weightsPath },
			options.model,
			options.schema,
			options.fairness,
			saltsMap,
			dataSetMerkleRoot,
			weightsHash,
		);

		return hash;
	}

	private async getCommitments(
		datasetRows: string[][],
		weights: Uint8Array,
		options: {
			encoding: encodingSchemas;
			hashAlgo: hashAlgos;
		},
	): Promise<{
		saltsMap: Record<number, string>;
		dataSetMerkleRoot: `0x${string}`;
		weightsHash: `0x${string}`;
	}> {
		const saltsMap: Record<number, string> = {};
		// store row hashes as plain hex (no 0x) to reduce size; merkle builder will normalize
		const rowHashes: string[] = [];

		for (let i = 0; i < datasetRows.length; i++) {
			const row = datasetRows[i];
			if (!row) throw new Error(`Row index ${i} missing while hashing dataset`);
			const encodedRow = await this.encodeRow(row, options.encoding);
			const salt = this.generateSalt();
			const hashedRow = await this.hashRow(encodedRow, salt, options.hashAlgo);
			if (hashedRow.length !== 64) {
				throw new Error(
					`Row hash length invalid (expected 64 hex chars, got ${hashedRow.length}) at index ${i}`,
				);
			}
			saltsMap[i] = salt;
			rowHashes.push(hashedRow);
		}
		const weightsHash = await this.hashWeights(weights, options.hashAlgo);

		const dataSetMerkleRoot = await merkleRoot(rowHashes, options.hashAlgo);

		if (
			!(dataSetMerkleRoot.startsWith("0x") && dataSetMerkleRoot.length === 66)
		) {
			throw new Error(`Merkle root malformed: ${dataSetMerkleRoot}`);
		}

		return {
			saltsMap,
			dataSetMerkleRoot,
			weightsHash,
		};
	}

	private async generateConfigDirectory(
		filePaths: { dataset: string; weights: string },
		metadata: CommitOptions["model"],
		schema: CommitOptions["schema"],
		fairnessConfig: CommitOptions["fairness"],
		salts: Record<number, string>,
		dataSetMerkleRoot: `0x${string}`,
		weightsHash: `0x${string}`,
	) {
		// Use weights hash (without 0x) for directory name for cleanliness.
		const baseDir = await ensureArtifactDir(weightsHash);

		await Promise.all([
			Bun.write(`${baseDir}/salts.json`, JSON.stringify(salts, null, 2)),
			Bun.write(`${baseDir}/metadata.json`, JSON.stringify(metadata, null, 2)),
			Bun.write(
				`${baseDir}/commitments.json`,
				JSON.stringify(
					{ datasetMerkleRoot: dataSetMerkleRoot, weightsHash },
					null,
					2,
				),
			),
			Bun.write(`${baseDir}/schema.json`, JSON.stringify(schema, null, 2)),
			Bun.write(
				`${baseDir}/paths.json`,
				JSON.stringify(
					{ dataset: filePaths.dataset, weights: filePaths.weights },
					null,
					2,
				),
			),
			Bun.write(
				`${baseDir}/fairness.json`,
				JSON.stringify(fairnessConfig, null, 2),
			),
		]);
		console.log(`✅ Config directory created at ${baseDir}`);
	}

	private async hashWeights(
		weightsBuffer: Uint8Array,
		algo: hashAlgos,
	): Promise<`0x${string}`> {
		const plain = await hashBytes(weightsBuffer, algo);
		if (plain.length !== 64) throw new Error("weights hash length invalid");
		return `0x${plain}` as `0x${string}`;
	}

	private async encodeRow(
		row: string[],
		encoding: encodingSchemas,
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
		hashAlgo: hashAlgos,
	): Promise<string> {
		// plain hex leaf hash (row || salt)
		const saltBytes = new TextEncoder().encode(salt);
		const combined = new Uint8Array(row.length + saltBytes.length);
		combined.set(row, 0);
		combined.set(saltBytes, row.length);
		const plain = await hashBytes(combined, hashAlgo); // already plain 64
		if (plain.length !== 64)
			throw new Error("row hash length invalid post hashing");
		return plain;
	}
}
