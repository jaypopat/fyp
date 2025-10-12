import type { Hash } from "viem";

export type SDKModelRaw = {
	name: string;
	author: Hash;
	description: string;
	datasetMerkleRoot: Hash;
	weightsHash: Hash;
	status: number;
	registrationTimestamp: bigint;
	verificationTimestamp: bigint;
	proofHash: Hash;
};

export type SDKModel = {
	name: string;
	author: Hash;
	description: string;
	datasetMerkleRoot: Hash;
	weightsHash: Hash;
	status: number;
	registrationTimestamp: number;
	verificationTimestamp: number | null;
	proofHash: Hash;
};

export function normalizeModel(model: SDKModelRaw): SDKModel {
	const registrationTimestamp = Number(model.registrationTimestamp);
	const verificationTimestampNumeric = Number(model.verificationTimestamp);

	return {
		name: model.name,
		author: model.author,
		description: model.description,
		datasetMerkleRoot: model.datasetMerkleRoot,
		weightsHash: model.weightsHash,
		status: model.status,
		proofHash: model.proofHash,
		registrationTimestamp,
		verificationTimestamp:
			verificationTimestampNumeric === 0 ? null : verificationTimestampNumeric,
	};
}

export function normalizeModels(models: readonly SDKModelRaw[]): SDKModel[] {
	return models.map((model) => normalizeModel(model));
}
