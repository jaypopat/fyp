import type { Hex } from "viem";
import type { encodingSchemas, hashAlgos } from "./types";

function assert(condition: unknown, msg: string): asserts condition {
	if (!condition) throw new Error(msg);
}

export function assertHex(value: string, label: string): asserts value is Hex {
	assert(typeof value === "string", `${label} must be string`);
	assert(value.startsWith("0x"), `${label} must start with 0x`);
	assert(
		value.length === 66,
		`${label} must be 0x + 64 hex chars (got length ${value.length})`,
	);
}

export interface PathsFile {
	dataset: string;
	weights: string;
	threshold: string;
}
export interface FairnessThresholdFile {
	metric: "demographic_parity" | "equalized_odds";
	targetDisparity: number;
	protectedAttribute: string;
}
export interface SchemaFile {
	cryptoAlgo: hashAlgos;
	encodingSchema: encodingSchemas;
}
export interface CommitmentsFile {
	datasetMerkleRoot: Hex;
	weightsHash: Hex;
}
export interface MetadataFile {
	name: string;
	description: string;
	creator?: string;
}
export interface FairnessFile {
	metric: "demographic_parity" | "equalized_odds";
	targetDisparity: number;
	protectedAttribute: string;
}
export interface MetaFile {
	version: number;
	createdAt: number;
}
export interface ProofFile {
	version: number;
	weightsHash: Hex;
	generatedAt: number;
	proof: Hex; // entire proof as hex (current format)
	publicInputs: Hex[];
}

export function parsePathsFile(data: unknown): PathsFile {
	assert(data && typeof data === "object", "paths.json malformed");
	const d = data as Record<string, unknown>;
	assert(typeof d.dataset === "string", "paths.dataset missing");
	assert(typeof d.weights === "string", "paths.weights missing");
	assert(typeof d.threshold === "string", "paths.threshold missing");

	return {
		dataset: d.dataset as string,
		weights: d.weights as string,
		threshold: d.threshold as string,
	};
}
export function parseCommitmentsFile(data: unknown): CommitmentsFile {
	assert(data && typeof data === "object", "commitments.json malformed");
	const d = data as Record<string, unknown>;
	assert(typeof d.datasetMerkleRoot === "string", "datasetMerkleRoot missing");
	assert(typeof d.weightsHash === "string", "weightsHash missing");
	assertHex(d.datasetMerkleRoot as string, "datasetMerkleRoot");
	assertHex(d.weightsHash as string, "weightsHash");
	return {
		datasetMerkleRoot: d.datasetMerkleRoot as Hex,
		weightsHash: d.weightsHash as Hex,
	};
}
export function parseProofFile(data: unknown): ProofFile {
	assert(data && typeof data === "object", "proof.json malformed");
	const d = data as Record<string, unknown>;
	assert(typeof d.version === "number", "proof.version missing");
	assert(typeof d.generatedAt === "number", "proof.generatedAt missing");
	assert(typeof d.weightsHash === "string", "weightsHash missing");
	assert(typeof d.proof === "string", "proof missing");
	assert(Array.isArray(d.publicInputs), "publicInputs must be array");
	assertHex(d.weightsHash as string, "weightsHash");
	assertHex(d.proof as string, "proof");
	const publicInputs = (d.publicInputs as unknown[]).map((p, i) => {
		assert(typeof p === "string", `publicInputs[${i}] must be string`);
		assertHex(p as string, `publicInputs[${i}]`);
		return p as Hex;
	});
	return {
		version: d.version as number,
		weightsHash: d.weightsHash as Hex,
		generatedAt: d.generatedAt as number,
		proof: d.proof as Hex,
		publicInputs,
	};
}
export function parseSchemaFile(data: unknown): SchemaFile {
	assert(data && typeof data === "object", "schema.json malformed");
	const d = data as Record<string, unknown>;
	assert(
		d.cryptoAlgo === "SHA-256" || d.cryptoAlgo === "BLAKE2b",
		"schema.cryptoAlgo invalid",
	);
	assert(
		d.encodingSchema === "JSON" || d.encodingSchema === "MSGPACK",
		"schema.encodingSchema invalid",
	);
	return {
		cryptoAlgo: d.cryptoAlgo as "SHA-256" | "BLAKE2b",
		encodingSchema: d.encodingSchema as "JSON" | "MSGPACK",
	};
}
