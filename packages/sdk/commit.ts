import { mkdir } from "node:fs/promises";
import type { Hash } from "viem";
import type { FairnessFile, PathsFile } from "./artifacts";
import type { ContractClient } from "./contract";
import { generateAllMerkleProofs, merkleRoot } from "./merkle";
import type { CommitOptions } from "./types";
import { getArtifactDir, parseCSV, weightsToFields } from "./utils";

const FIELD_MODULUS =
	21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export class CommitAPI {
	constructor(private contracts: ContractClient) {}

	async makeCommitment(
		dataSetPath: string,
		weightsPath: string,
		fairnessThresholdPath: string,
		options: CommitOptions,
	): Promise<Hash> {
		const datasetRows = await parseCSV(dataSetPath);
		const weights = await Bun.file(weightsPath).arrayBuffer();
		const fairnessThreshold = (await Bun.file(
			fairnessThresholdPath,
		).json()) as FairnessFile;

		// Compute weights hash first (used for cache directory)
		const weightsHash = await this.hashWeights(new Uint8Array(weights));

		// Check for cached commitments
		const cachedData = await this.loadCachedCommitments(
			weightsHash,
			dataSetPath,
			weightsPath,
			options.model,
		);

		let masterSalt: string;
		let saltsMap: Record<number, string>;
		let dataSetMerkleRoot: Hash;
		let merklePaths: string[][];
		let isEvenFlags: boolean[][];

		if (cachedData) {
			console.log(" Using cached commitments (files unchanged)");
			masterSalt = cachedData.masterSalt;
			saltsMap = cachedData.salts;
			dataSetMerkleRoot = cachedData.datasetMerkleRoot;
			merklePaths = cachedData.merklePaths;
			isEvenFlags = cachedData.isEvenFlags;
		} else {
			console.log("Computing fresh commitments...");

			// Generate deterministic master salt from model files
			masterSalt = await this.generateMasterSalt(
				weightsPath,
				dataSetPath,
				options.model,
			);

			const commitments = await this.getCommitments(
				datasetRows,
				new Uint8Array(weights),
				masterSalt,
				weightsHash, // Pass already-computed hash to avoid recomputation
			);

			saltsMap = commitments.saltsMap;
			dataSetMerkleRoot = commitments.dataSetMerkleRoot;
			merklePaths = commitments.merklePaths;
			isEvenFlags = commitments.isEvenFlags;
		}

		// Attempt to register the model - if it already exists, provide a clear error
		let hash: Hash;
		try {
			// Convert fairness threshold from decimal to percentage integer
			// Contract expects uint256 between 1-100 representing percentage
			const fairnessThresholdPercent = Math.ceil(
				fairnessThreshold.targetDisparity * 100,
			);
			// log the commitments
			console.log("Registering model with the following commitments:");
			console.log(" Weights Hash:", weightsHash);
			console.log(" Dataset Merkle Root:", dataSetMerkleRoot);

			hash = await this.contracts.registerModel(
				options.model.name,
				options.model.description,
				weightsHash,
				dataSetMerkleRoot,
				fairnessThresholdPercent,
			);
		} catch (err) {
			throw new Error(
				`Failed to register model commitment: ${(err as Error).message}`,
			);
		}

		// Store artifacts in ~/.zkfair/<weights-hash>/
		await this.generateConfigDirectory(
			{
				dataset: dataSetPath,
				weights: weightsPath,
				fairnessThreshold: fairnessThresholdPath,
			},
			options.model,
			masterSalt,
			saltsMap,
			dataSetMerkleRoot,
			weightsHash,
			merklePaths,
			isEvenFlags,
		);

		return hash;
	}

	/**
	 * Generate deterministic master salt from model files.
	 * Uses SHA-256 only (circuit receives pre-computed salts from salts.json).
	 * Outputs integer representation (first 31 bytes as Field element)
	 * master_salt = SHA-256(weights_hash || dataset_hash || metadata_hash)
	 */
	private async generateMasterSalt(
		weightsPath: string,
		datasetPath: string,
		metadata: CommitOptions["model"],
	): Promise<string> {
		// Hash each file/data independently
		const weightsBuffer = await Bun.file(weightsPath).arrayBuffer();
		const weightsHashBuf = await crypto.subtle.digest("SHA-256", weightsBuffer);
		const weightsHash = Buffer.from(weightsHashBuf).toString("hex");

		const datasetBuffer = await Bun.file(datasetPath).arrayBuffer();
		const datasetHashBuf = await crypto.subtle.digest("SHA-256", datasetBuffer);
		const datasetHash = Buffer.from(datasetHashBuf).toString("hex");

		const metadataString = JSON.stringify({
			name: metadata.name,
			description: metadata.description,
			creator: metadata.creator,
		});
		const metadataHashBuf = await crypto.subtle.digest(
			"SHA-256",
			new TextEncoder().encode(metadataString),
		);
		const metadataHash = Buffer.from(metadataHashBuf).toString("hex");

		// Combine with SHA-256
		const combined = weightsHash + datasetHash + metadataHash;
		const masterSaltBuf = await crypto.subtle.digest(
			"SHA-256",
			new TextEncoder().encode(combined),
		);
		const masterSaltHex = Buffer.from(masterSaltBuf).toString("hex");
		const masterSaltBigInt = BigInt(`0x${masterSaltHex}`);

		const masterSalt = (masterSaltBigInt % FIELD_MODULUS).toString();

		return masterSalt;
	}

	/**
	 * Load cached commitments if they exist and files haven't changed.
	 * Returns null if cache is invalid or doesn't exist.
	 */
	private async loadCachedCommitments(
		weightsHash: Hash,
		datasetPath: string,
		weightsPath: string,
		_metadata: CommitOptions["model"],
	): Promise<{
		masterSalt: string;
		salts: Record<number, string>;
		datasetMerkleRoot: Hash;
		merklePaths: string[][];
		isEvenFlags: boolean[][];
	} | null> {
		try {
			const dir = getArtifactDir(weightsHash);

			// Check if cache directory exists
			const dirExists = await Bun.file(`${dir}/master_salt.txt`).exists();
			if (!dirExists) {
				return null;
			}

			// Load cached paths to verify files haven't changed
			const pathsFile = Bun.file(`${dir}/paths.json`);
			if (!(await pathsFile.exists())) {
				return null;
			}

			const cachedPaths = (await pathsFile.json()) as PathsFile;

			// Verify paths match (ie cache aint invalid)
			if (
				cachedPaths.dataset !== datasetPath ||
				cachedPaths.weights !== weightsPath
			) {
				console.log(" Cache invalid: file paths changed");
				return null;
			}

			// Load all cached artifacts
			const [masterSalt, salts, commitments, merkleProofs] = await Promise.all([
				Bun.file(`${dir}/master_salt.txt`).text(),
				Bun.file(`${dir}/salts.json`).json() as Promise<Record<number, string>>,
				Bun.file(`${dir}/commitments.json`).json() as Promise<{
					datasetMerkleRoot: Hash;
				}>,
				Bun.file(`${dir}/merkle_proofs.json`).json() as Promise<{
					merklePaths: string[][];
					isEvenFlags: boolean[][];
				}>,
			]);

			return {
				masterSalt: masterSalt.trim(),
				salts,
				datasetMerkleRoot: commitments.datasetMerkleRoot,
				merklePaths: merkleProofs.merklePaths,
				isEvenFlags: merkleProofs.isEvenFlags,
			};
		} catch {
			// Cache doesn't exist or is corrupted
			return null;
		}
	}

	private async getCommitments(
		datasetRows: string[][],
		weights: Uint8Array,
		masterSalt: string,
		weightsHash?: Hash,
	): Promise<{
		saltsMap: Record<number, string>;
		dataSetMerkleRoot: Hash;
		weightsHash: Hash;
		merklePaths: string[][];
		isEvenFlags: boolean[][];
	}> {
		// Use provided weightsHash (used for cache lookup in fs)
		const finalWeightsHash = weightsHash || (await this.hashWeights(weights));

		// Derive per-row salts from master salt
		const saltsMap = await this.deriveSalts(
			masterSalt,
			datasetRows.length,
			finalWeightsHash,
		);

		const rowHashes: string[] = [];
		console.log(` Hashing ${datasetRows.length} dataset rows with Poseidon...`);

		for (let i = 0; i < datasetRows.length; i++) {
			const row = datasetRows[i];
			if (!row) throw new Error(`Row index ${i} missing while hashing dataset`);
			const salt = saltsMap[i];
			if (!salt) throw new Error(`Salt missing for row ${i}`);
			const hashedRow = await this.hashRow(row, salt);
			if (hashedRow.length !== 64) {
				throw new Error(
					`Row hash length invalid (expected 64 hex chars, got ${hashedRow.length}) at index ${i}`,
				);
			}
			rowHashes.push(hashedRow);
		}

		const dataSetMerkleRoot = await merkleRoot(rowHashes);

		if (
			!(dataSetMerkleRoot.startsWith("0x") && dataSetMerkleRoot.length === 66)
		) {
			throw new Error(`Merkle root malformed: ${dataSetMerkleRoot}`);
		}

		// Generate Merkle proofs for all leaves
		console.log(` Generating Merkle proofs for ${rowHashes.length} leaves...`);
		const MAX_TREE_HEIGHT = 15; // Same as circuit constant
		const { merkle_paths, is_even_flags } = await generateAllMerkleProofs(
			rowHashes,
			MAX_TREE_HEIGHT,
		);

		return {
			saltsMap,
			dataSetMerkleRoot,
			weightsHash: finalWeightsHash,
			merklePaths: merkle_paths,
			isEvenFlags: is_even_flags,
		};
	}

	/**
	 * Derive per-row salts using SHA-256 (fast, deterministic).
	 * Outputs integer representation (first 31 bytes as Field element)
	 * Salts are private inputs to circuit, no need for ZK-friendly derivation.
	 * row_salt[i] = SHA-256(master_salt || row_index || weightsHash) → converted to integer
	 */
	private async deriveSalts(
		masterSalt: string,
		rowCount: number,
		weightsHash: Hash,
	): Promise<Record<number, string>> {
		const salts: Record<number, string> = {};

		console.log(` Deriving ${rowCount} row salts with SHA-256...`);
		for (let i = 0; i < rowCount; i++) {
			// Combine master_salt + index + weightsHash
			// Note: masterSalt is now an integer string, so reconstruct the hash
			const input = `${masterSalt}${i}${weightsHash}`;
			const saltBuf = await crypto.subtle.digest(
				"SHA-256",
				new TextEncoder().encode(input),
			);
			const saltHex = Buffer.from(saltBuf).toString("hex");
			const saltBigInt = BigInt(`0x${saltHex}`);

			const saltField = saltBigInt % FIELD_MODULUS;
			salts[i] = saltField.toString();
		}
		return salts;
	}

	private async generateConfigDirectory(
		filePaths: { dataset: string; weights: string; fairnessThreshold: string },
		metadata: CommitOptions["model"],
		masterSalt: string,
		salts: Record<number, string>,
		dataSetMerkleRoot: Hash,
		weightsHash: Hash,
		merklePaths: string[][],
		isEvenFlags: boolean[][],
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
			Bun.write(
				`${dir}/paths.json`,
				JSON.stringify(
					{
						dataset: filePaths.dataset,
						weights: filePaths.weights,
						fairnessThreshold: filePaths.fairnessThreshold,
					},
					null,
					2,
				),
			),
			Bun.write(
				`${dir}/merkle_proofs.json`,
				JSON.stringify({ merklePaths, isEvenFlags }, null, 2),
			),
		]);
		console.log(` Artifacts saved to ${dir}`);
	}

	private async hashWeights(weightsBuffer: Uint8Array): Promise<Hash> {
		// Parse binary weights file (float32 array)
		const weightsFloat32 = new Float32Array(weightsBuffer.buffer);

		// Convert to Field array
		const weightsFields = await weightsToFields(weightsFloat32);

		// Hash with Poseidon for ZK-verifiable commitment
		const { hashPoseidonFields } = await import("./utils");
		const weightsHash = hashPoseidonFields(weightsFields);

		return `0x${weightsHash}` as Hash;
	}

	private async hashRow(
		row: Array<number | string>,
		salt: string,
	): Promise<string> {
		// Hash: Poseidon([...row_values, salt_bigint])
		const { hashPoseidonFields } = await import("./utils");
		const saltBigInt = BigInt(salt);
		const rowWithSalt = [...row, saltBigInt];
		const hash = await hashPoseidonFields(rowWithSalt);
		if (hash.length !== 64)
			throw new Error("row hash length invalid post hashing");
		return hash;
	}
}
