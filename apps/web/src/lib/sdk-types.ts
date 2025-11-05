import type { Hash } from "viem";

export type SDKModelRaw = {
	name: string;
	description: string;
	provider: Hash;
	weightsHash: Hash;
	datasetMerkleRoot: Hash;
	fairnessThreshold: bigint;
	status: number;
	stake: bigint;
	registeredAt: bigint;
	verifiedAt: bigint;
	certificationProofHash: Hash;
};

// This is the type used by the frontend components.
export type SDKModel = {
	name: string;
	author: Hash;
	description: string;
	datasetMerkleRoot: Hash;
	fairnessThreshold: string;
	weightsHash: Hash;
	status: number;
	registrationTimestamp: number;
	verificationTimestamp: number | null;
	proofHash: Hash;
};

/**
 * Converts a single SDKModelRaw to SDKModel, mapping contract fields to UI fields.
 */
export function normalizeModel(model: SDKModelRaw): SDKModel {
	const registrationTimestamp = Number(model.registeredAt);
	const verificationTimestampNumeric = Number(model.verifiedAt);

	return {
		name: model.name,
		author: model.provider,
		description: model.description,
		datasetMerkleRoot: model.datasetMerkleRoot,
		fairnessThreshold: model.fairnessThreshold.toString(),
		weightsHash: model.weightsHash,
		status: model.status,
		proofHash: model.certificationProofHash, // Map `certificationProofHash` to `proofHash`
		registrationTimestamp,
		verificationTimestamp:
			verificationTimestampNumeric === 0 ? null : verificationTimestampNumeric,
	};
}

/**
 * Normalizes an array of SDKModelRaw into SDKModel[]
 */
export function normalizeModels(models: readonly SDKModelRaw[]): SDKModel[] {
	return models.map(normalizeModel);
}
