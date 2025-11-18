/**
 * Generate Prover.toml for training circuit from SDK artifacts
 * Usage: bun packages/zk-circuits/scripts/fill-prover-toml.ts <weightsHash>
 * Then: cd packages/zk-circuits/training && nargo execute
 */
/** biome-ignore-all lint/style/noUnusedTemplateLiteral: <explanation> */
import {
	parseCommitmentsFile,
	parseFairnessThresholdFile,
	parsePathsFile,
} from "../../sdk/artifacts";
import { getArtifactDir, parseCSV, weightsToFields } from "../../sdk/utils";

const weightsHash = process.argv[2] as `0x${string}`;
if (!weightsHash) {
	console.error("Usage: bun fill-prover-toml.ts <weightsHash>");
	process.exit(1);
}

// Helper to safely convert value to quoted string for TOML
// CRITICAL: Always quote values so TOML doesn't interpret as native integers
function toTomlString(value: any): string {
	if (value == null || value === "" || Number.isNaN(value)) {
		return '"0"';
	}
	// Convert to string and quote it
	return `"${String(value)}"`;
}

async function generateProverToml() {
	const dir = getArtifactDir(weightsHash);
	console.log(`Loading artifacts from: ${dir}\n`);

	// Load all artifacts
	const rawPaths = await Bun.file(`${dir}/paths.json`).json();
	const paths = parsePathsFile(rawPaths);

	const weights_data = await Bun.file(paths.weights).arrayBuffer();
	const weightsFields = await weightsToFields(new Float32Array(weights_data));
	const dataset = await parseCSV(paths.dataset);

	const salts = (await Bun.file(`${dir}/salts.json`).json()) as Record<
		number,
		string
	>;
	const thresholds = parseFairnessThresholdFile(
		await Bun.file(paths.fairnessThreshold).json(),
	);
	const commitments = parseCommitmentsFile(
		await Bun.file(`${dir}/commitments.json`).json(),
	);
	// Load merkle proofs (generated at commit time)
	const merkleProofs = (await Bun.file(`${dir}/merkle_proofs.json`).json()) as {
		merklePaths: string[][];
		isEvenFlags: boolean[][];
	};

	// Use subset for testing
	const MAX_CIRCUIT_SIZE = 10;
	const datasetSubset = dataset.slice(0, MAX_CIRCUIT_SIZE);
	const saltsSubset = Object.values(salts).slice(0, MAX_CIRCUIT_SIZE);

	console.log(" Data Summary:");
	console.log(`  Weights: ${weightsFields.length} values`);
	console.log(
		`  Dataset: ${datasetSubset.length} rows (from ${dataset.length} total)`,
	);
	console.log(`  Features per row: ${datasetSubset[0]?.length || 0}`);
	console.log(`  Salts: ${saltsSubset.length}`);
	console.log(
		`  Protected Attribute Index: ${thresholds.protectedAttributeIndex}\n`,
	);

	// Generate TOML content
	let toml = "# Auto-generated Prover.toml for training circuit\n\n";

	// Model weights (ALL values must be quoted strings)
	toml += `_model_weights = [${weightsFields.map((w) => `"${w}"`).join(", ")}]\n\n`;

	// Dataset size (quoted string)
	toml += `_dataset_size = "${datasetSubset.length}"\n\n`;

	// Dataset features (flatten, exclude last column which is label)
	const features = datasetSubset.flatMap((row) => row.slice(0, -1));
	toml += `_dataset_features = [${features.map((f) => toTomlString(f)).join(", ")}]\n\n`;

	// Dataset labels (last column)
	const labels = datasetSubset.map((row) => row[row.length - 1] ?? 0);
	toml += `_dataset_labels = [${labels.map((l) => toTomlString(l)).join(", ")}]\n\n`;

	// Sensitive attributes
	const sensitiveAttrs = datasetSubset.map(
		(row) => row[thresholds.protectedAttributeIndex] ?? 0,
	);
	toml += `_dataset_sensitive_attrs = [${sensitiveAttrs.map((a) => toTomlString(a)).join(", ")}]\n\n`;

	// Thresholds (already scaled integers in JSON)
	toml += `_threshold_group_a = "${thresholds.thresholds.group_a}"\n`;
	toml += `_threshold_group_b = "${thresholds.thresholds.group_b}"\n\n`;

	// Salts (ALL values must be quoted strings - these are large field elements)
	toml += `_dataset_salts = [${saltsSubset.map((s) => `"${s}"`).join(", ")}]\n\n`;

	// Merkle proofs: convert hex siblings to decimal Field strings and include is_even flags
	// Only include proofs for the dataset subset we are testing
	const subsetProofs = merkleProofs.merklePaths.slice(0, datasetSubset.length);
	const subsetFlags = merkleProofs.isEvenFlags.slice(0, datasetSubset.length);

	// Helper to convert 0x-prefixed hex to decimal string
	function hexToDecimalString(h: string) {
		const clean = h.startsWith("0x") ? h.slice(2) : h;
		return BigInt(`0x${clean}`).toString();
	}

	// _merkle_paths: array of arrays of quoted decimal strings
	toml += `_merkle_paths = [\n`;
	toml += subsetProofs
		.map((path) => {
			const converted = path
				.map((p) => `"${hexToDecimalString(p)}"`)
				.join(", ");
			return `  [${converted}]`;
		})
		.join(",\n");
	toml += `\n]\n\n`;

	// _is_even_flags: array of arrays of booleans (unquoted)
	toml += `_is_even_flags = [\n`;
	toml += subsetFlags
		.map((flags) => {
			const converted = flags.map((f) => (f ? "true" : "false")).join(", ");
			return `  [${converted}]`;
		})
		.join(",\n");
	toml += `\n]\n\n`;

	// Public inputs (all quoted strings)
	toml += `_weights_hash = "${weightsHash}"\n`;
	toml += `_dataset_merkle_root = "${commitments.datasetMerkleRoot}"\n`;
	toml += `_fairness_threshold_epsilon = "${Math.ceil(thresholds.targetDisparity * 100)}"\n`;

	// Write to training circuit directory
	const outputPath = "./training/Prover.toml";
	await Bun.write(outputPath, toml);

	console.log(` Generated: ${outputPath}`);
	console.log("\n First few weights (for verification):");
	console.log(`  ${weightsFields.slice(0, 3).map(String).join(", ")}`);
	console.log("\nTo execute circuit:");
	console.log("  cd packages/zk-circuits/training");
	console.log("  nargo execute");
	console.log("\nTo check for constraint errors:");
	console.log("  nargo check\n");
}

generateProverToml().catch((error) => {
	console.error(" Error:", error.message);
	process.exit(1);
});
