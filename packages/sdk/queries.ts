import { encode } from "@msgpack/msgpack";
import type { Hash } from "viem";
import type { ContractClient } from "./client";
import { merkleRoot } from "./merkle";
import type { encodingSchemas, hashAlgos } from "./types";
import { hashBytes } from "./utils";

interface QueryRecord {
	id: number;
	query: string;
	timestamp: number;
	modelId: number;
	modelWeightsHash: Hash;
	input: unknown[];
	prediction: number;
}

export class QueriesAPI {
	private batches: Map<number, QueryRecord[]> = new Map(); // modelId to batch of queries
	private batchThreshold: number;
	private encoding: encodingSchemas;
	private hashAlgo: hashAlgos;

	constructor(
		private contracts: ContractClient,
		batchThreshold = 1000,
		encoding: encodingSchemas = "MSGPACK",
		hashAlgo: hashAlgos = "SHA-256",
	) {
		this.batchThreshold = batchThreshold;
		this.encoding = encoding;
		this.hashAlgo = hashAlgo;
	}

	public logQuery(query: QueryRecord) {
		const { modelId } = query;

		if (!this.batches.has(modelId)) {
			this.batches.set(modelId, []);
		}

		const batch = this.batches.get(modelId);
		if (!batch) return;

		batch.push(query);

		if (batch.length >= this.batchThreshold) {
			this.submitBatchMerkleOnChain(modelId);
		}
	}

	private async submitBatchMerkleOnChain(modelId: number) {
		const batch = this.batches.get(modelId);
		if (!batch || batch.length === 0) {
			console.warn(`No queries to submit for modelId ${modelId}`);
			return;
		}

		const leaves: string[] = [];
		for (const record of batch) {
			const queryData = {
				queryId: record.id,
				input: record.input,
				prediction: record.prediction,
				timestamp: record.timestamp,
			};

			let encodedQuery: Uint8Array;

			if (this.encoding === "MSGPACK") {
				encodedQuery = encode(queryData);
			} else {
				const jsonString = JSON.stringify(queryData);
				encodedQuery = new TextEncoder().encode(jsonString);
			}
			const hash = await hashBytes(encodedQuery, this.hashAlgo);
			leaves.push(hash);
		}
		const root = await merkleRoot(leaves, this.hashAlgo);

		console.log(
			`Submitting batch of ${batch.length} queries for modelId ${modelId} with Merkle root: 0x${root}`,
		);

		// this.contracts.submitQueryBatch(modelId, `0x${root}`);

		this.saveBatchLocally(modelId, batch, root, leaves);
		this.batches.delete(modelId);

		return root;
	}
	private saveBatchLocally(
		modelId: number,
		batch: QueryRecord[],
		root: string,
		leaves: string[],
	) {}
}
