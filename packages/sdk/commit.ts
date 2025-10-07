import { encode } from "@msgpack/msgpack";
import { mkdir } from "node:fs/promises";
import type { ContractClient } from "./client";
import { merkleRoot } from "./merkle";
import type { CommitOptions, encodingSchemas, hashAlgos } from "./types";
import { hashBytes, parseCSV, getArtifactDir } from "./utils";

export class CommitAPI {
	constructor(private contracts: ContractClient) { }

	async makeCommitment(
		dataSetPath: string,
		weightsPath: string,
		options: CommitOptions,
	): Promise<`0x${string}`> {
		const datasetRows = await parseCSV(dataSetPath);
		const weights = await Bun.file(weightsPath).arrayBuffer();

		// Generate deterministic master salt from model files
		const masterSalt = await this.generateMasterSalt(
			weightsPath,
			dataSetPath,
			options.model,
		);

		const { saltsMap, dataSetMerkleRoot, weightsHash } = await this.getCommitments(
			datasetRows,
			new Uint8Array(weights),
			masterSalt,
			{
				encoding: options.schema.encodingSchema,
				hashAlgo: options.schema.cryptoAlgo,
			},
		);

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

		// Store artifacts in ~/.zkfair/<weights-hash>/
		await this.generateConfigDirectory(
			{ dataset: dataSetPath, weights: weightsPath },
			options.model,
			options.schema,
			options.fairness,
			masterSalt,
			saltsMap,
			dataSetMerkleRoot,
			weightsHash,
		);

		return hash;
	}

	/**
	 * Generate deterministic master salt from model files.
	 * This ensures same model files always produce the same commitment.
	 * 
	 * master_salt = HASH(weights_hash || dataset_hash || metadata_json)
	 */
	private async generateMasterSalt(
		weightsPath: string,
		datasetPath: string,
		metadata: CommitOptions["model"],
	): Promise<string> {
		// Hash the weights file
		const weightsBuffer = await Bun.file(weightsPath).arrayBuffer();
		const weightsHash = await hashBytes(new Uint8Array(weightsBuffer), "SHA-256");

		// Hash the dataset file
		const datasetBuffer = await Bun.file(datasetPath).arrayBuffer();
		const datasetHash = await hashBytes(new Uint8Array(datasetBuffer), "SHA-256");

		// Hash the metadata (for determinism based on model identity)
		const metadataString = JSON.stringify({
			name: metadata.name,
			description: metadata.description,
			creator: metadata.creator,
		});
		const metadataHash = await hashBytes(
			new TextEncoder().encode(metadataString),
			"SHA-256",
		);

		// Combine all hashes to create master salt
		const combined = `${weightsHash}:${datasetHash}:${metadataHash}`;
		const masterSalt = await hashBytes(
			new TextEncoder().encode(combined),
			"SHA-256",
		);

		return masterSalt;
	}

	private async getCommitments(
		datasetRows: string[][],
		weights: Uint8Array,
		masterSalt: string,
		options: {
			encoding: encodingSchemas;
			hashAlgo: hashAlgos;
		},
	): Promise<{
		saltsMap: Record<number, string>;
		dataSetMerkleRoot: `0x${string}`;
		weightsHash: `0x${string}`;
	}> {
		const weightsHash = await this.hashWeights(weights, options.hashAlgo);

		// Derive per-row salts from master salt
		const saltsMap = await this.deriveSalts(
			masterSalt,
			datasetRows.length,
			weightsHash,
			options.hashAlgo,
		);

		const rowHashes: string[] = [];
		for (let i = 0; i < datasetRows.length; i++) {
			const row = datasetRows[i];
			if (!row) throw new Error(`Row index ${i} missing while hashing dataset`);
			const encodedRow = await this.encodeRow(row, options.encoding);
			const salt = saltsMap[i];
			if (!salt) throw new Error(`Salt missing for row ${i}`);
			const hashedRow = await this.hashRow(encodedRow, salt, options.hashAlgo);
			if (hashedRow.length !== 64) {
				throw new Error(
					`Row hash length invalid (expected 64 hex chars, got ${hashedRow.length}) at index ${i}`,
				);
			}
			rowHashes.push(hashedRow);
		}

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

	/**
	 * Derive per-row salts from master salt using:
	 * row_salt[i] = HASH(master_salt || ":" || row_index || ":" || weightsHash)
	 */
	private async deriveSalts(
		masterSalt: string,
		rowCount: number,
		weightsHash: `0x${string}`,
		hashAlgo: hashAlgos,
	): Promise<Record<number, string>> {
		const salts: Record<number, string> = {};
		for (let i = 0; i < rowCount; i++) {
			const input = `${masterSalt}:${i}:${weightsHash}`;
			const inputBytes = new TextEncoder().encode(input);
			salts[i] = await hashBytes(inputBytes, hashAlgo);
		}
		return salts;
	}

	private async generateConfigDirectory(
		filePaths: { dataset: string; weights: string },
		metadata: CommitOptions["model"],
		schema: CommitOptions["schema"],
		fairnessConfig: CommitOptions["fairness"],
		masterSalt: string,
		salts: Record<number, string>,
		dataSetMerkleRoot: `0x${string}`,
		weightsHash: `0x${string}`,
	) {
		const dir = getArtifactDir(weightsHash);
		await mkdir(dir, { recursive: true });

		await Promise.all([
			Bun.write(`${dir}/master_salt.txt`, masterSalt),
			Bun.write(`${dir}/salts.json`, JSON.stringify(salts, null, 2)),
			Bun.write(`${dir}/metadata.json`, JSON.stringify(metadata, null, 2)),
			Bun.write(
				`${dir}/commitments.json`,
				JSON.stringify(
					{ datasetMerkleRoot: dataSetMerkleRoot, weightsHash },
					null,
					2,
				),
			),
			Bun.write(`${dir}/schema.json`, JSON.stringify(schema, null, 2)),
			Bun.write(
				`${dir}/paths.json`,
				JSON.stringify(
					{ dataset: filePaths.dataset, weights: filePaths.weights },
					null,
					2,
				),
			),
			Bun.write(
				`${dir}/fairness.json`,
				JSON.stringify(fairnessConfig, null, 2),
			),
		]);
		console.log(`✅ Artifacts saved to ${dir}`);
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
