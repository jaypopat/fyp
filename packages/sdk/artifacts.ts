import type { Hash } from "viem";

function assert(condition: unknown, msg: string): asserts condition {
	if (!condition) throw new Error(msg);
}

export function assertHash(
	value: string,
	label: string,
): asserts value is Hash {
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
	fairnessThreshold: string;
}
export interface Thresholds {
	group_a: number;
	group_b: number;
}

export interface FairnessThresholdFile {
	metric: "demographic_parity" | "equalized_odds";
	targetDisparity: number;
	protectedAttribute: string;
	protectedAttributeIndex: number; // Column index of sensitive attribute in dataset
	thresholds: Thresholds;
	calculatedMetrics?: Record<string, number>;
}

export function parseFairnessThresholdFile(
	data: unknown,
): FairnessThresholdFile {
	assert(data && typeof data === "object", "threshold file malformed");
	const d = data as Record<string, unknown>;
	assert(typeof d.metric === "string", "threshold.metric missing");
	assert(
		typeof d.targetDisparity === "number",
		"threshold.targetDisparity missing",
	);
	assert(
		typeof d.protectedAttribute === "string",
		"threshold.protectedAttribute missing",
	);
	assert(
		typeof d.protectedAttributeIndex === "number",
		"threshold.protectedAttributeIndex missing",
	);
	assert(
		d.thresholds && typeof d.thresholds === "object",
		"thresholds missing",
	);
	const t = d.thresholds as Record<string, unknown>;
	assert(typeof t.group_a === "number", "thresholds.group_a missing");
	assert(typeof t.group_b === "number", "thresholds.group_b missing");

	const calc = d.calculatedMetrics as Record<string, unknown> | undefined;
	const calculatedMetrics = calc
		? (Object.fromEntries(
				Object.entries(calc).filter(([_, v]) => typeof v === "number"),
			) as Record<string, number>)
		: undefined;

	return {
		metric: d.metric as "demographic_parity" | "equalized_odds",
		targetDisparity: d.targetDisparity as number,
		protectedAttribute: d.protectedAttribute as string,
		protectedAttributeIndex: d.protectedAttributeIndex as number,
		thresholds: { group_a: t.group_a as number, group_b: t.group_b as number },
		calculatedMetrics,
	};
}

export interface CommitmentsFile {
	datasetMerkleRoot: Hash;
	weightsHash: Hash;
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
	weightsHash: Hash;
	generatedAt: number;
	proof: Hash; // entire proof as hex (current format)
	publicInputs: Hash[];
}

export function parsePathsFile(data: unknown): PathsFile {
	assert(data && typeof data === "object", "paths.json malformed");
	const d = data as Record<string, unknown>;
	assert(typeof d.dataset === "string", "paths.dataset missing");
	assert(typeof d.weights === "string", "paths.weights missing");
	assert(typeof d.fairnessThreshold === "string", "paths.threshold missing");

	return {
		dataset: d.dataset as string,
		weights: d.weights as string,
		fairnessThreshold: d.fairnessThreshold as string,
	};
}
export function parseCommitmentsFile(data: unknown): CommitmentsFile {
	assert(data && typeof data === "object", "commitments.json malformed");
	const d = data as Record<string, unknown>;
	assert(typeof d.datasetMerkleRoot === "string", "datasetMerkleRoot missing");
	assert(typeof d.weightsHash === "string", "weightsHash missing");
	assertHash(d.datasetMerkleRoot as string, "datasetMerkleRoot");
	assertHash(d.weightsHash as string, "weightsHash");
	return {
		datasetMerkleRoot: d.datasetMerkleRoot as Hash,
		weightsHash: d.weightsHash as Hash,
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
	assertHash(d.weightsHash as string, "weightsHash");
	assertHash(d.proof as string, "proof");
	const publicInputs = (d.publicInputs as unknown[]).map((p, i) => {
		assert(typeof p === "string", `publicInputs[${i}] must be string`);
		assertHash(p as string, `publicInputs[${i}]`);
		return p as Hash;
	});
	return {
		version: d.version as number,
		weightsHash: d.weightsHash as Hash,
		generatedAt: d.generatedAt as number,
		proof: d.proof as Hash,
		publicInputs,
	};
}
