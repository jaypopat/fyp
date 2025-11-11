import { createHash } from "node:crypto";
import { join } from "node:path";

// Configuration
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
const MODEL_JSON_PATH = join(
	__dirname,
	"../../../examples/adult-income/model.json",
);
const FAIRNESS_THRESHOLD_PATH = join(
	__dirname,
	"../../../examples/adult-income/fairness_threshold.json",
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
 * Load model weights from model.json
 */
async function loadModelWeights(): Promise<number[]> {
	try {
		const file = Bun.file(MODEL_JSON_PATH);
		const modelJson = await file.json();
		const weights = modelJson.coefficients || modelJson.weights;

		if (!Array.isArray(weights)) {
			throw new Error("Weights not found in model.json");
		}

		console.log(`✓ Loaded ${weights.length} model weights`);
		return weights;
	} catch (error) {
		console.warn(
			"⚠ Could not load model weights, using placeholder values:",
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
		console.log("✓ Loaded fairness thresholds");
		return {
			epsilon: thresholds.epsilon || 0.05,
			thresholdA: thresholds.threshold_group_a || 0.5,
			thresholdB: thresholds.threshold_group_b || 0.5,
		};
	} catch (error) {
		console.warn(
			"⚠ Could not load fairness thresholds, using defaults:",
			error,
		);
		return {
			epsilon: 0.05,
			thresholdA: 0.5,
			thresholdB: 0.5,
		};
	}
}

/**
 * Generate random salt for each data point
 */
function generateSalt(): string {
	return `0x${Math.random().toString(16).slice(2).padStart(64, "0")}`;
}

/**
 * Compute hash of weights (for public input)
 */
function computeWeightsHash(weights: number[]): string {
	const hash = createHash("sha256");
	for (const w of weights) {
		hash.update(w.toString());
	}
	return `0x${hash.digest("hex")}`;
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
	console.log("🔧 Filling Prover.toml with calibration data...\n");

	// 1. Load calibration dataset
	console.log("📂 Loading calibration dataset...");
	const file = Bun.file(CALIBRATION_CSV_PATH);
	const csvContent = await file.text();
	const { headers, rows } = parseCSV(csvContent);
	console.log(`✓ Loaded ${rows.length} rows with ${headers.length} columns`);

	// 2. Limit to MAX_DATASET_SIZE
	const limitedRows = rows.slice(0, MAX_DATASET_SIZE);
	console.log(`✓ Using first ${limitedRows.length} rows for circuit\n`);

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

	// 5. Generate salts for each data point
	console.log("🔐 Generating salts for data points...");
	const salts = limitedRows.map(() => generateSalt());
	while (salts.length < MAX_DATASET_SIZE) {
		salts.push("");
	}
	console.log(`✓ Generated ${limitedRows.length} salts\n`);

	// 6. Load model weights
	console.log("🧠 Loading model weights...");
	const weights = await loadModelWeights();
	const weightsHash = computeWeightsHash(weights);
	console.log(`✓ Weights hash: ${weightsHash}\n`);

	// 7. Load fairness thresholds
	console.log("⚖️  Loading fairness thresholds...");
	const { epsilon, thresholdA, thresholdB } = await loadFairnessThresholds();
	console.log(`✓ Epsilon: ${epsilon}`);
	console.log(`✓ Threshold Group A: ${thresholdA}`);
	console.log(`✓ Threshold Group B: ${thresholdB}\n`);

	// 8. Compute dataset Merkle root
	console.log("🌳 Computing dataset Merkle root...");
	const merkleRoot = computeDatasetMerkleRoot(
		features,
		labels,
		sensitiveAttrs,
		salts,
	);
	console.log(`✓ Merkle root: ${merkleRoot}\n`);

	// 9. Generate Prover.toml content
	console.log("📝 Generating Prover.toml content...");

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
	console.log("💾 Writing to Prover.toml...");
	await Bun.write(PROVER_TOML_PATH, proverTomlContent);
	console.log("✓ Prover.toml written successfully!\n");

	console.log("✅ Done! You can now run: cd training && nargo prove");
}

// Run the script
main();
