import path from "node:path";

/** 0x-prefixed hash string */
type Hash = `0x${string}`;
/** 0x-prefixed hex string */
type Hex = `0x${string}`;

/** Fairness configuration with per-group thresholds */
type FairnessFile = {
	thresholds: {
		group_a: number;
		group_b: number;
	};
};

/** Audit query record */
type AuditRecord = {
	queryId: string;
	modelId: number;
	inputHash: Hex;
	prediction: number;
	timestamp: number;
};

/**
 * Circuit inputs for training proof (Phase 1)
 * These are the private and public inputs that the circuit expects
 */
export type TrainingInputs = {
	weights: number[];
	dataset: number[][];
	salts: Record<number, string>;
	// Public inputs (loaded separately)
	dataset_merkle_root: Hash;
	weights_hash: Hash;
};

/**
 * Circuit inputs for audit proof (Phase 3)
 */
export type AuditInputs = {
	query_records: AuditRecord[];
	// Public inputs
	batch_merkle_root: Hash;
	dataset_merkle_root: Hash;
	weights_hash: Hash;
	group_a_threshold: number;
	group_b_threshold: number;
};

/**
 * Build proof inputs in-memory for direct noir.execute() call
 * This is the preferred production path - fast, type-safe, no file I/O
 *
 * Returns both private and public inputs as typed objects
 */
export async function buildProofInputs(params: {
	weightsHash: Hash;
	proofType: "training" | "audit";
	trainingParams?: {
		weightsPath: string;
		datasetPath: string;
		saltsPath: string;
	};
	auditParams?: {
		batchMerkleRoot: Hash;
		datasetMerkleRoot: Hash;
		queryRecords: AuditRecord[];
		fairnessThreshold: FairnessFile;
	};
}): Promise<TrainingInputs | AuditInputs> {
	if (params.proofType === "training") {
		if (!params.trainingParams) {
			throw new Error("trainingParams required for training proofs");
		}

		const tp = params.trainingParams;

		// Load weights as binary
		const weightsBuffer = await Bun.file(tp.weightsPath).arrayBuffer();
		const weights = Array.from(new Uint8Array(weightsBuffer));

		// Load dataset as CSV
		const datasetText = await Bun.file(tp.datasetPath).text();
		const datasetLines = datasetText.trim().split("\n");
		const dataset = datasetLines.slice(1).map((line) => {
			return line.split(",").map((v) => Number(v));
		});

		// Load salts from salts.json
		const saltsJson = (await Bun.file(tp.saltsPath).json()) as Record<
			number,
			string
		>;

		// Load commitments for public inputs
		const commitmentDir = path.dirname(tp.saltsPath);
		const commitmentsFile = await Bun.file(
			path.join(commitmentDir, "commitments.json"),
		).json();
		const datasetMerkleRoot = commitmentsFile.datasetMerkleRoot as Hash;

		return {
			weights,
			dataset,
			salts: saltsJson,
			dataset_merkle_root: datasetMerkleRoot,
			weights_hash: params.weightsHash,
		};
	}

	if (!params.auditParams) {
		throw new Error("auditParams required for audit proofs");
	}

	const ap = params.auditParams;

	return {
		query_records: ap.queryRecords,
		batch_merkle_root: ap.batchMerkleRoot,
		dataset_merkle_root: ap.datasetMerkleRoot,
		weights_hash: params.weightsHash,
		group_a_threshold: ap.fairnessThreshold.thresholds.group_a,
		group_b_threshold: ap.fairnessThreshold.thresholds.group_b,
	};
}

/**
 * Fill Prover.toml for circuit development and testing
 * This writes inputs to disk so you can use nargo prove CLI
 *
 * Only used for development - production uses buildProofInputs() + noir.execute()
 */
export async function fillProverToml(params: {
	weightsHash: Hash;
	proofType: "training" | "audit";
	trainingParams?: {
		weightsPath: string;
		datasetPath: string;
		saltsPath: string;
	};
	auditParams?: {
		batchMerkleRoot: Hash;
		datasetMerkleRoot: Hash;
		queryRecords: AuditRecord[];
		fairnessThreshold: FairnessFile;
	};
}): Promise<void> {
	const proverTomlPath = "Prover.toml";

	if (params.proofType === "training") {
		if (!params.trainingParams) {
			throw new Error("trainingParams required for training proofs");
		}

		const tp = params.trainingParams;

		// Load weights as binary
		const weightsBuffer = await Bun.file(tp.weightsPath).arrayBuffer();
		const weights = Array.from(new Uint8Array(weightsBuffer));

		// Load dataset as CSV
		const datasetText = await Bun.file(tp.datasetPath).text();
		const datasetLines = datasetText.trim().split("\n");
		const dataset = datasetLines.slice(1).map((line) => {
			return line.split(",").map((v) => Number(v));
		});

		// Load salts from salts.json (pre-computed during commitment)
		const saltsJson = (await Bun.file(tp.saltsPath).json()) as Record<
			number,
			string
		>;

		// Load commitments for public inputs
		const commitmentDir = path.dirname(tp.saltsPath);
		const commitmentsFile = await Bun.file(
			path.join(commitmentDir, "commitments.json"),
		).json();
		const datasetMerkleRoot = commitmentsFile.datasetMerkleRoot as Hash;

		// Build Prover.toml content for training proof
		const proverContent = `
# Phase 1: Training Proof (Certification)
# Public inputs: weights_hash, dataset_merkle_root
# Private inputs: weights, dataset, salts
# Usage: nargo prove (development only)

[public_inputs]
weights_hash = "${params.weightsHash}"
dataset_merkle_root = "${datasetMerkleRoot}"

[private_inputs]
weights = ${JSON.stringify(weights)}
dataset = ${JSON.stringify(dataset)}
salts = ${JSON.stringify(saltsJson)}
`;

		await Bun.write(proverTomlPath, proverContent);
		console.log(
			`✓ Training Prover.toml filled (dataset: ${dataset.length} rows, weights: ${weights.length} bytes)`,
		);
	} else if (params.proofType === "audit") {
		if (!params.auditParams) {
			throw new Error("auditParams required for audit proofs");
		}

		const ap = params.auditParams;

		// Build Prover.toml content for audit proof
		// Phase 3: Audit queries against the model
		const proverContent = `
# Phase 3: Audit Proof (Fairness Verification)
# Public inputs: batch_merkle_root, dataset_merkle_root, weights_hash, thresholds
# Private inputs: query_records
# Usage: nargo prove (development only)

[public_inputs]
batch_merkle_root = "${ap.batchMerkleRoot}"
dataset_merkle_root = "${ap.datasetMerkleRoot}"
weights_hash = "${params.weightsHash}"
group_a_threshold = ${ap.fairnessThreshold.thresholds.group_a}
group_b_threshold = ${ap.fairnessThreshold.thresholds.group_b}

[private_inputs]
query_records = ${JSON.stringify(ap.queryRecords)}
`;

		await Bun.write(proverTomlPath, proverContent);
		console.log(
			`✓ Audit Prover.toml filled (batch root: ${ap.batchMerkleRoot}, ${ap.queryRecords.length} queries)`,
		);
		return;
	}

	throw new Error(`Unknown proof type: ${params.proofType}`);
}

// CLI entry point (for development/testing)
async function main() {
	console.log(
		"This module exports buildProofInputs() for production and fillProverToml() for development",
	);
	console.log("Usage:");
	console.log("  Production: const inputs = await buildProofInputs({...})");
	console.log("  Development: await fillProverToml({...}) then nargo prove");
}

main().catch((err) => {
	console.error("Error:", err);
	process.exit(1);
});
