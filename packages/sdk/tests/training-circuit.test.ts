import { UltraHonkBackend } from "@aztec/bb.js";
import { type CompiledCircuit, Noir } from "@noir-lang/noir_js";
import {
	training_circuit,
	type trainingInputType,
} from "@zkfair/zk-circuits/codegen";

import type { Hash } from "viem";
import {
	parseCommitmentsFile,
	parseFairnessThresholdFile,
	parsePathsFile,
} from "../artifacts";
import { getArtifactDir, parseCSV, weightsToFields } from "../utils";

async function generateAndSubmitProof(
	weightsHash: Hash,
): Promise<{ proofHex: `0x${string}`; publicInputs: `0x${string}`[] }> {
	const dir = getArtifactDir(weightsHash);
	const rawPaths = await Bun.file(`${dir}/paths.json`).json();
	const paths = parsePathsFile(rawPaths);

	// Load dataset & weights
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

	// Load Merkle proofs
	const merkleProofs = (await Bun.file(`${dir}/merkle_proofs.json`).json()) as {
		merklePaths: string[][];
		isEvenFlags: boolean[][];
	};

	// Convert hex merkle paths to decimal strings for the circuit
	const merklePathsDecimal = merkleProofs.merklePaths.map((path) =>
		path.map((hex) => {
			const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
			return BigInt(`0x${clean}`).toString();
		}),
	);

	console.log(" Circuit Input Summary:");
	console.log(`  Weights: ${weightsFields.length} values`);
	console.log(`  Dataset: ${dataset.length} rows x 14 features`);
	console.log(`  Salts: ${Object.keys(salts).length} values`);
	console.log(
		`  Protected Attribute Index: ${thresholds.protectedAttributeIndex}`,
	);
	console.log(
		`  Thresholds: group_a=${thresholds.thresholds.group_a}, group_b=${thresholds.thresholds.group_b}`,
	);

	const input: trainingInputType = {
		// private inputs
		_model_weights: weightsFields.map(String),
		_dataset_size: String(dataset.length),
		_dataset_features: dataset.flatMap((row) => row.slice(0, -1).map(String)),
		_dataset_labels: dataset.map((row) => String(row[row.length - 1] ?? "0")),
		_dataset_sensitive_attrs: dataset.map((row) =>
			String(row[thresholds.protectedAttributeIndex] ?? "0"),
		),
		_threshold_group_a: String(thresholds.thresholds.group_a),
		_threshold_group_b: String(thresholds.thresholds.group_b),
		_dataset_salts: Object.values(salts),
		_merkle_paths: merklePathsDecimal,
		_is_even_flags: merkleProofs.isEvenFlags,
		// public inputs
		_weights_hash: weightsHash,
		_dataset_merkle_root: commitments.datasetMerkleRoot,
		_fairness_threshold_epsilon: Math.ceil(
			thresholds.targetDisparity * 100,
		).toString(),
	};

	console.log("\n Executing circuit...");
	const noir = new Noir(training_circuit as CompiledCircuit);
	const { witness } = await noir.execute(input);
	console.log(" Circuit executed successfully");

	console.log(" Generating proof...");
	const backend = new UltraHonkBackend(training_circuit.bytecode);
	const proofData = await backend.generateProof(witness);

	const proofHash = `0x${Array.from(proofData.proof)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")}` as Hash;
	console.log(" Proof generated successfully, hash:", proofHash);

	console.log(" Proof generated successfully");
}

generateAndSubmitProof(
	"0x1371d09ac9cd9cea9637e46bead0cda0e0c804c133876b2cf7aa6c28a549f8cb",
)
	.then(() => process.exit(0))
	.catch((error) => {
		const fs = require("fs");
		const timestamp = new Date().toISOString();
		const logEntry = `[${timestamp}]\n${error.stack || error}\n\n`;
		fs.appendFileSync("circuit-errors.log", logEntry);

		console.error("\n Test failed - see circuit-errors.log for details\n");
		process.exit(1);
	});
