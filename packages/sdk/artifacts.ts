import type { encodingSchemas, hashAlgos } from "./types";

export type Hex32 = `0x${string}`; // expected length 66 when validated

function assert(condition: unknown, msg: string): asserts condition {
	if (!condition) throw new Error(msg);
}

export function assertHex32(
	value: string,
	label: string,
): asserts value is Hex32 {
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
}
export interface SchemaFile {
	cryptoAlgo: hashAlgos;
	encodingSchema: encodingSchemas;
}
export interface CommitmentsFile {
	datasetMerkleRoot: Hex32;
	weightsHash: Hex32;
}
export interface MetadataFile {
	name: string;
	description: string;
	creator?: string;
	version?: string;
}
export interface MetaFile {
	version: number;
	createdAt: number;
}
export interface ProofFile {
	version: number;
	weightsHash: Hex32;
	generatedAt: number;
	proof: Hex32; // entire proof as hex (current format)
	publicInputs: Hex32[];
}

export function parsePathsFile(data: unknown): PathsFile {
	assert(data && typeof data === "object", "paths.json malformed");
	const d = data as Record<string, unknown>;
	assert(typeof d.dataset === "string", "paths.dataset missing");
	assert(typeof d.weights === "string", "paths.weights missing");
	return { dataset: d.dataset as string, weights: d.weights as string };
}
export function parseCommitmentsFile(data: unknown): CommitmentsFile {
	assert(data && typeof data === "object", "commitments.json malformed");
	const d = data as Record<string, unknown>;
	assert(typeof d.datasetMerkleRoot === "string", "datasetMerkleRoot missing");
	assert(typeof d.weightsHash === "string", "weightsHash missing");
	assertHex32(d.datasetMerkleRoot as string, "datasetMerkleRoot");
	assertHex32(d.weightsHash as string, "weightsHash");
	return {
		datasetMerkleRoot: d.datasetMerkleRoot as Hex32,
		weightsHash: d.weightsHash as Hex32,
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
	assertHex32(d.weightsHash as string, "weightsHash");
	assertHex32(d.proof as string, "proof");
	const publicInputs = (d.publicInputs as unknown[]).map((p, i) => {
		assert(typeof p === "string", `publicInputs[${i}] must be string`);
		assertHex32(p as string, `publicInputs[${i}]`);
		return p as Hex32;
	});
	return {
		version: d.version as number,
		weightsHash: d.weightsHash as Hex32,
		generatedAt: d.generatedAt as number,
		proof: d.proof as Hex32,
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
