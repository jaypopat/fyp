import { createHash } from "node:crypto";
import { join } from "node:path";

// Config
const MAX_DATASET_SIZE = 1200;
const NUM_FEATURES = 14;
const NUM_WEIGHTS = 14;

// Paths (relative to zk-circuits package root)
const __dirname = new URL(".", import.meta.url).pathname;
const PROVER_TOML_PATH = join(__dirname, "../training/Prover.toml");
const CALIBRATION_CSV_PATH = join(
	__dirname,
	"../../../examples/adult-income/calibration_dataset.csv",
);
const FAIRNESS_THRESHOLD_PATH = join(
	__dirname,
	"../../../examples/adult-income/fairness_threshold.json",
);
const WEIGHTS_BIN_PATH = join(
	__dirname,
	"../../../examples/adult-income/weights.bin",
);

/**
 * Parse CSV file
 */
function parseCSV(csvContent: string): {
	headers: string[];
	rows: string[][];
} {
	const lines = csvContent.trim().split("\n");
	const headers = lines[0]?.split(",") || [];
	const rows = lines.slice(1).map((line) => line.split(","));
	return { headers, rows };
}

/**
 * Load model weights from weights.bin (binary float32 array)
 */
async function loadModelWeights(): Promise<number[]> {
	try {
		const weightsBuffer = await Bun.file(WEIGHTS_BIN_PATH).arrayBuffer();
		const weightsFloat32 = new Float32Array(weightsBuffer);
		const weightsArray = Array.from(weightsFloat32);

		console.log(` Loaded ${weightsArray.length} model weights from binary file`);
		return weightsArray;
	} catch (error) {
		console.warn(
			" Could not load model weights, using placeholder values:",
			error,
		);
		return Array(NUM_WEIGHTS).fill(0.1);
	}
}

/**
 * Load fairness thresholds
 */
async function loadFairnessThresholds(): Promise<{
	epsilon: number;
	thresholdA: number;
	thresholdB: number;
}> {
	try {
		const file = Bun.file(FAIRNESS_THRESHOLD_PATH);
		const thresholds = await file.json();
		console.log(" Loaded fairness thresholds");
		return {
			epsilon: thresholds.epsilon || 0.05,
			thresholdA: thresholds.threshold_group_a || 0.5,
			thresholdB: thresholds.threshold_group_b || 0.5,
		};
	} catch (error) {
		console.warn(" Could not load fairness thresholds, using defaults:", error);
		return {
			epsilon: 0.05,
			thresholdA: 0.5,
			thresholdB: 0.5,
		};
	}
}

/**
 * Compute hash of weights (for public input and cache lookup).
 * Uses Poseidon hash over Field array (same as SDK commitment).
 */
async function computeWeightsHash(weights: number[]): Promise<string> {
	const SCALE = 1_000_000n;
	const MAX_FIELD = (1n << 253n) - 1n; // BN254 field size

	// Convert Float32 weights to Field elements (matching SDK logic)
	const weightsFields: bigint[] = [];
	for (const weight of weights) {
		const scaled = BigInt(Math.round(weight * Number(SCALE)));
		const field = scaled >= 0n ? scaled % MAX_FIELD : (MAX_FIELD + (scaled % MAX_FIELD)) % MAX_FIELD;
		weightsFields.push(field);
	}

	// Import SDK's hash function
	const { hashPoseidonFields } = await import("../../sdk/utils");

	// Hash with Poseidon (matching SDK)
	const hash = await hashPoseidonFields(weightsFields);

	return hash; // Returns hex string without 0x prefix
}

/**
 * Load salts from cached commitment artifacts.
 * Ensures circuit uses exact same salts as the commitment.
 */
async function loadSaltsFromCache(weightsHash: string): Promise<string[]> {
	try {
		const home = Bun.env.HOME || require("node:os").homedir();
		const cacheDir = join(home, ".zkfair", weightsHash.slice(2));
		const saltsFile = Bun.file(join(cacheDir, "salts.json"));

		if (!(await saltsFile.exists())) {
			throw new Error(
				`Salts cache not found at ${cacheDir}. Run 'zkfair commit' first to generate commitments.`,
			);
		}

		const saltsMap = (await saltsFile.json()) as Record<number, string>;
		const saltsArray: string[] = [];

		// Convert salts map to array
		for (let i = 0; i < Object.keys(saltsMap).length; i++) {
			const salt = saltsMap[i];
			if (!salt) {
				throw new Error(`Missing salt for row ${i}`);
			}
			saltsArray.push(`0x${salt}`);
		}

		console.log(` Loaded ${saltsArray.length} salts from cache`);
		return saltsArray;
	} catch (error) {
		console.error("Failed to load salts from cache:", error);
		throw error;
	}
}

/**
 * Compute Merkle root of dataset (simplified for now)
 */
function computeDatasetMerkleRoot(
	features: number[][],
	labels: number[],
	sensitiveAttrs: number[],
	salts: string[],
): string {
	// For now, just hash all the data together
	// TODO: Implement proper Merkle tree
	const hash = createHash("sha256");

	for (let i = 0; i < features.length; i++) {
		const row = features[i];
		if (row) {
			hash.update(row.join(","));
			hash.update(labels[i]?.toString() || "0");
			hash.update(sensitiveAttrs[i]?.toString() || "0");
			hash.update(salts[i] || "");
		}
	}

	return `0x${hash.digest("hex")}`;
}

/**
 * Format array for TOML (proper nested format)
 */
function formatArrayForTOML(arr: (string | number)[][]): string {
	return "[" + arr.map((row) => `["${row.join('", "')}"]`).join(", ") + "]";
}

/**
 * Format 1D array for TOML
 */
function format1DArrayForTOML(arr: (string | number)[]): string {
	return `["${arr.join('", "')}"]`;
}

/**
 * Main function
 */
async function main() {
	console.log(" Filling Prover.toml with calibration data...\n");

	// 1. Load calibration dataset
	console.log(" Loading calibration dataset...");
	const file = Bun.file(CALIBRATION_CSV_PATH);
	const csvContent = await file.text();
	const { headers, rows } = parseCSV(csvContent);
	console.log(` Loaded ${rows.length} rows with ${headers.length} columns`);

	// 2. Limit to MAX_DATASET_SIZE
	const limitedRows = rows.slice(0, MAX_DATASET_SIZE);
	console.log(` Using first ${limitedRows.length} rows for circuit\n`);

	// 3. Extract features, labels, and sensitive attributes
	const features: number[][] = [];
	const labels: number[] = [];
	const sensitiveAttrs: number[] = []; // Use 'sex' column (index 9)

	for (const row of limitedRows) {
		// Features: all columns except the last one (label)
		const featureRow = row.slice(0, -1).map((val) => Number.parseFloat(val));
		features.push(featureRow);

		// Label: last column
		const label = Number.parseFloat(row[row.length - 1] || "0");
		labels.push(label);

		// Sensitive attribute: 'sex' column (index 9 in original dataset)
		const sensitiveAttr = Number.parseFloat(row[9] || "0");
		sensitiveAttrs.push(sensitiveAttr);
	}

	// 4. Pad arrays to MAX_DATASET_SIZE with zeros
	while (features.length < MAX_DATASET_SIZE) {
		features.push(Array(NUM_FEATURES).fill(0));
		labels.push(0);
		sensitiveAttrs.push(0);
	}

	// 5. Load model weights (needed for cache lookup)
	console.log(" Loading model weights...");
	const weights = await loadModelWeights();
	const weightsHash = await computeWeightsHash(weights);
	console.log(` Weights hash: 0x${weightsHash}\n`);

	// 6. Load salts from commitment cache
	console.log(" Loading salts from commitment cache...");
	const cachedSalts = await loadSaltsFromCache(`0x${weightsHash}`);

	// Pad salts to MAX_DATASET_SIZE
	const salts = [...cachedSalts];
	while (salts.length < MAX_DATASET_SIZE) {
		salts.push("0x" + "0".repeat(64));
	}
	console.log(` Using ${cachedSalts.length} salts from cache (padded to ${MAX_DATASET_SIZE})\n`);

	// 7. Load fairness thresholds
	console.log(" Loading fairness thresholds...");
	const { epsilon, thresholdA, thresholdB } = await loadFairnessThresholds();
	console.log(` Epsilon: ${epsilon}`);
	console.log(` Threshold Group A: ${thresholdA}`);
	console.log(` Threshold Group B: ${thresholdB}\n`);

	// 8. Compute dataset Merkle root
	console.log(" Computing dataset Merkle root...");
	const merkleRoot = computeDatasetMerkleRoot(
		features,
		labels,
		sensitiveAttrs,
		salts,
	);
	console.log(` Merkle root: ${merkleRoot}\n`);

	// 9. Generate Prover.toml content
	console.log(" Generating Prover.toml content...");

	const proverTomlContent = `# Auto-generated Prover.toml
# Generated at: ${new Date().toISOString()}
# Dataset size: ${limitedRows.length} rows (padded to ${MAX_DATASET_SIZE})

# ===== PRIVATE INPUTS =====

_model_weights = ["${weights.join('", "')}"]

_dataset_size = "${limitedRows.length}"

_dataset_features = ${formatArrayForTOML(features)}

_dataset_labels = ${format1DArrayForTOML(labels)}

_dataset_sensitive_attrs = ${format1DArrayForTOML(sensitiveAttrs)}

_threshold_group_a = "${thresholdA}"

_threshold_group_b = "${thresholdB}"

_dataset_salts = ${format1DArrayForTOML(salts)}

# ===== PUBLIC INPUTS =====

_weights_hash = "${weightsHash}"

_dataset_merkle_root = "${merkleRoot}"

_fairness_threshold_epsilon = "${epsilon}"
`;

	// 10. Write to file
	console.log(" Writing to Prover.toml...");
	await Bun.write(PROVER_TOML_PATH, proverTomlContent);
	console.log(" Prover.toml written successfully!\n");

	console.log(" Done! You can now run: cd training && nargo prove");
}

// Run the script
main();
