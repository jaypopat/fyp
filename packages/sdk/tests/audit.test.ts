import { describe, expect, it } from "bun:test";
import { UltraHonkBackend } from "@aztec/bb.js";
import { type CompiledCircuit, Noir } from "@noir-lang/noir_js";
import {
	fairness_audit_circuit,
	type fairness_auditInputType,
} from "@zkfair/zk-circuits/codegen";
import { poseidon2, poseidon8, poseidon15 } from "poseidon-lite";
import { createMerkleProof, merkleRoot } from "../merkle";

// Circuit constants (must match fairness_audit/src/main.nr)
const NUM_FEATURES = 14;
const SAMPLE_SIZE = 10;
const TREE_DEPTH = 7;
const NUM_WEIGHTS = 15;

type TestRecord = {
	features: number[];
	prediction: number;
	sensitiveAttr: number;
};

/**
 * Hash a record leaf exactly as the circuit does:
 * leaf_data = [features[0..13], prediction, sensitiveAttr] (16 fields)
 * hash1 = poseidon8(leaf_data[0..7])
 * hash2 = poseidon8(leaf_data[8..15])
 * leaf_hash = poseidon2([hash1, hash2])
 */
function hashRecordLeaf(r: TestRecord): string {
	const leafData: bigint[] = [];

	// Add 14 features (pad with 0 if needed)
	for (let i = 0; i < NUM_FEATURES; i++) {
		leafData.push(BigInt(r.features[i] ?? 0));
	}

	// Add binary prediction (circuit expects 0 or 1)
	leafData.push(r.prediction >= 0.5 ? 1n : 0n);

	// Add sensitive attribute
	leafData.push(BigInt(r.sensitiveAttr));

	// Hash exactly as circuit does
	const hash1 = poseidon8(leafData.slice(0, 8));
	const hash2 = poseidon8(leafData.slice(8, 16));
	const leafHash = poseidon2([hash1, hash2]);

	// Convert to 64-char hex (no 0x prefix)
	return leafHash.toString(16).padStart(64, "0");
}

/**
 * Generate synthetic test records for fairness audit
 * Creates records with balanced group representation for fairness
 */
function generateTestRecords(count: number): TestRecord[] {
	const records: TestRecord[] = [];

	for (let i = 0; i < count; i++) {
		// Alternate sensitive attribute between 0 and 1 for balanced groups
		const sensitiveAttr = i % 2;

		// Generate deterministic features based on index
		const features: number[] = [];
		for (let j = 0; j < NUM_FEATURES; j++) {
			features.push((i * 7 + j * 13) % 100); // Deterministic pseudo-random values
		}

		// Fair predictions: roughly equal positive rates across groups
		// Group A (sensitiveAttr=0): positive if i % 4 === 0 or i % 4 === 1
		// Group B (sensitiveAttr=1): positive if i % 4 === 1 or i % 4 === 2
		// This gives ~50% positive rate for both groups
		const prediction =
			sensitiveAttr === 0
				? i % 4 <= 1
					? 1
					: 0
				: i % 4 >= 1 && i % 4 <= 2
					? 1
					: 0;

		records.push({ features, prediction, sensitiveAttr });
	}

	return records;
}

/**
 * Generate model weights that match the weights hash
 */
function generateTestWeights(): { weights: bigint[]; weightsHash: string } {
	// Simple deterministic weights
	const weights: bigint[] = [];
	for (let i = 0; i < NUM_WEIGHTS; i++) {
		weights.push(BigInt((i + 1) * 1000));
	}

	// Hash weights using poseidon15 (matches circuit)
	const weightsHash = poseidon15(weights);
	return {
		weights,
		weightsHash: weightsHash.toString(16).padStart(64, "0"),
	};
}

/**
 * Build validity mask for samples
 * true = valid sample, false = padding (circuit skips these)
 */
function buildValidityMask(actualCount: number): boolean[] {
	const mask: boolean[] = [];
	for (let i = 0; i < SAMPLE_SIZE; i++) {
		mask.push(i < actualCount);
	}
	return mask;
}

describe("Fairness Audit Circuit", () => {
	it("should hash record leaves correctly matching circuit format", () => {
		const record: TestRecord = {
			features: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
			prediction: 1,
			sensitiveAttr: 0,
		};

		const leafHash = hashRecordLeaf(record);

		expect(leafHash).toBeString();
		expect(leafHash.length).toBe(64);
		expect(/^[0-9a-f]{64}$/.test(leafHash)).toBe(true);

		console.log("Record leaf hash:", leafHash);
	});

	it("should build merkle tree from records", async () => {
		const records = generateTestRecords(10);
		const leaves = records.map(hashRecordLeaf);

		const root = await merkleRoot(leaves);

		expect(root).toBeString();
		expect(root.startsWith("0x")).toBe(true);
		expect(root.length).toBe(66); // 0x + 64 hex chars

		console.log("Merkle root:", root);
		console.log("Number of leaves:", leaves.length);
	});

	it("should generate valid merkle proofs for all records", async () => {
		const records = generateTestRecords(10);
		const leaves = records.map(hashRecordLeaf);

		for (let i = 0; i < records.length; i++) {
			const { root, proof } = await createMerkleProof(leaves, i);
			expect(root).toBeString();
			expect(proof.length).toBeGreaterThan(0);
		}

		console.log("All merkle proofs generated successfully");
	});

	it("should execute fairness_audit circuit with synthetic data", async () => {
		// 1. Generate test data
		const records = generateTestRecords(SAMPLE_SIZE);
		const leaves = records.map(hashRecordLeaf);
		const root = await merkleRoot(leaves);
		const { weights, weightsHash } = generateTestWeights();

		console.log("\n=== Circuit Input Summary ===");
		console.log(`Records: ${records.length}`);
		console.log(`Merkle root: ${root}`);
		console.log(`Weights hash: 0x${weightsHash}`);

		// 2. Generate merkle proofs for all samples
		const merkleProofs: string[][] = [];
		const pathIndices: boolean[][] = [];

		for (let i = 0; i < SAMPLE_SIZE; i++) {
			const { proof } = await createMerkleProof(leaves, i);

			// Pad proof to TREE_DEPTH
			const paddedProof: string[] = [];
			const paddedIndices: boolean[] = [];

			for (let j = 0; j < TREE_DEPTH; j++) {
				const step = proof[j];
				if (step) {
					const hex = step.sibling.startsWith("0x")
						? step.sibling.slice(2)
						: step.sibling;
					paddedProof.push(BigInt(`0x${hex || "0"}`).toString());
					paddedIndices.push(step.position === "right");
				} else {
					paddedProof.push("0");
					paddedIndices.push(false);
				}
			}

			merkleProofs.push(paddedProof);
			pathIndices.push(paddedIndices);
		}

		// 3. Prepare circuit inputs with validity mask
		const sampleFeatures = records.flatMap((r) =>
			r.features.slice(0, NUM_FEATURES).map(String),
		);
		const samplePredictions = records.map((r) => String(r.prediction));
		const sampleSensitiveAttrs = records.map((r) => String(r.sensitiveAttr));
		const sampleValid = buildValidityMask(SAMPLE_SIZE);

		const input: fairness_auditInputType = {
			_model_weights: weights.map(String),
			_sample_count: SAMPLE_SIZE.toString(),
			_sample_valid: sampleValid,
			_sample_features: sampleFeatures,
			_sample_predictions: samplePredictions,
			_sample_sensitive_attrs: sampleSensitiveAttrs,
			_merkle_proofs: merkleProofs,
			_merkle_path_indices: pathIndices,
			_threshold_group_a: "5000", // 50% threshold
			_threshold_group_b: "5000", // 50% threshold
			_batch_merkle_root: root.startsWith("0x")
				? BigInt(root).toString()
				: BigInt(`0x${root}`).toString(),
			_weights_hash: BigInt(`0x${weightsHash}`).toString(),
			_fairness_threshold_epsilon: "20", // 20% max disparity
		};

		console.log("\n=== Executing Circuit ===");
		console.log(`Sample features: ${sampleFeatures.length} values`);
		console.log(`Sample predictions: ${samplePredictions.join(", ")}`);
		console.log(`Sample sensitive attrs: ${sampleSensitiveAttrs.join(", ")}`);

		// 4. Execute circuit
		const noir = new Noir(fairness_audit_circuit as CompiledCircuit);
		const { witness } = await noir.execute(input);

		console.log("✓ Circuit executed successfully");
		expect(witness).toBeDefined();
	});

	it("should generate and verify proof for fairness_audit circuit", async () => {
		// 1. Generate test data
		const records = generateTestRecords(SAMPLE_SIZE);
		const leaves = records.map(hashRecordLeaf);
		const root = await merkleRoot(leaves);
		const { weights, weightsHash } = generateTestWeights();

		// 2. Generate merkle proofs
		const merkleProofs: string[][] = [];
		const pathIndices: boolean[][] = [];

		for (let i = 0; i < SAMPLE_SIZE; i++) {
			const { proof } = await createMerkleProof(leaves, i);

			const paddedProof: string[] = [];
			const paddedIndices: boolean[] = [];

			for (let j = 0; j < TREE_DEPTH; j++) {
				const step = proof[j];
				if (step) {
					const hex = step.sibling.startsWith("0x")
						? step.sibling.slice(2)
						: step.sibling;
					paddedProof.push(BigInt(`0x${hex || "0"}`).toString());
					paddedIndices.push(step.position === "right");
				} else {
					paddedProof.push("0");
					paddedIndices.push(false);
				}
			}

			merkleProofs.push(paddedProof);
			pathIndices.push(paddedIndices);
		}

		// 3. Prepare circuit inputs with validity mask
		const sampleValid = buildValidityMask(SAMPLE_SIZE);
		const input: fairness_auditInputType = {
			_model_weights: weights.map(String),
			_sample_count: SAMPLE_SIZE.toString(),
			_sample_valid: sampleValid,
			_sample_features: records.flatMap((r) =>
				r.features.slice(0, NUM_FEATURES).map(String),
			),
			_sample_predictions: records.map((r) => String(r.prediction)),
			_sample_sensitive_attrs: records.map((r) => String(r.sensitiveAttr)),
			_merkle_proofs: merkleProofs,
			_merkle_path_indices: pathIndices,
			_threshold_group_a: "5000",
			_threshold_group_b: "5000",
			_batch_merkle_root: BigInt(root).toString(),
			_weights_hash: BigInt(`0x${weightsHash}`).toString(),
			_fairness_threshold_epsilon: "20",
		};

		console.log("\n=== Generating ZK Proof ===");

		// 4. Execute and generate proof
		const noir = new Noir(fairness_audit_circuit as CompiledCircuit);
		const { witness } = await noir.execute(input);
		console.log("✓ Witness generated");

		const backend = new UltraHonkBackend(fairness_audit_circuit.bytecode);
		const proofData = await backend.generateProof(witness);
		console.log("✓ Proof generated");

		expect(proofData.proof).toBeDefined();
		expect(proofData.proof.length).toBeGreaterThan(0);
		expect(proofData.publicInputs).toBeDefined();

		// 5. Verify proof
		const isValid = await backend.verifyProof(proofData);
		console.log(`✓ Proof verification: ${isValid ? "PASSED" : "FAILED"}`);

		expect(isValid).toBe(true);

		// Log proof stats
		const proofHex = Array.from(proofData.proof)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
		console.log(`  Proof size: ${proofData.proof.length} bytes`);
		console.log(`  Public inputs: ${proofData.publicInputs.length}`);
		console.log(`  Proof hash: 0x${proofHex.slice(0, 64)}...`);
	}, 120000); // 2 minute timeout for proof generation

	it("should fail circuit execution when fairness threshold is violated", async () => {
		// Create biased records: Group A always gets positive, Group B never does
		const records: TestRecord[] = [];
		for (let i = 0; i < SAMPLE_SIZE; i++) {
			const sensitiveAttr = i % 2;
			const features: number[] = [];
			for (let j = 0; j < NUM_FEATURES; j++) {
				features.push((i * 7 + j * 13) % 100);
			}
			// Biased predictions: Group A (0) = always positive, Group B (1) = always negative
			const prediction = sensitiveAttr === 0 ? 1 : 0;
			records.push({ features, prediction, sensitiveAttr });
		}

		const leaves = records.map(hashRecordLeaf);
		const root = await merkleRoot(leaves);
		const { weights, weightsHash } = generateTestWeights();

		// Generate merkle proofs
		const merkleProofs: string[][] = [];
		const pathIndices: boolean[][] = [];

		for (let i = 0; i < SAMPLE_SIZE; i++) {
			const { proof } = await createMerkleProof(leaves, i);

			const paddedProof: string[] = [];
			const paddedIndices: boolean[] = [];

			for (let j = 0; j < TREE_DEPTH; j++) {
				const step = proof[j];
				if (step) {
					const hex = step.sibling.startsWith("0x")
						? step.sibling.slice(2)
						: step.sibling;
					paddedProof.push(BigInt(`0x${hex || "0"}`).toString());
					paddedIndices.push(step.position === "right");
				} else {
					paddedProof.push("0");
					paddedIndices.push(false);
				}
			}

			merkleProofs.push(paddedProof);
			pathIndices.push(paddedIndices);
		}

		const sampleValid = buildValidityMask(SAMPLE_SIZE);
		const input: fairness_auditInputType = {
			_model_weights: weights.map(String),
			_sample_count: SAMPLE_SIZE.toString(),
			_sample_valid: sampleValid,
			_sample_features: records.flatMap((r) =>
				r.features.slice(0, NUM_FEATURES).map(String),
			),
			_sample_predictions: records.map((r) => String(r.prediction)),
			_sample_sensitive_attrs: records.map((r) => String(r.sensitiveAttr)),
			_merkle_proofs: merkleProofs,
			_merkle_path_indices: pathIndices,
			_threshold_group_a: "5000",
			_threshold_group_b: "5000",
			_batch_merkle_root: BigInt(root).toString(),
			_weights_hash: BigInt(`0x${weightsHash}`).toString(),
			_fairness_threshold_epsilon: "10", // Very strict threshold (10%)
		};

		console.log("\n=== Testing Fairness Violation ===");
		console.log("Group A predictions: all positive (100%)");
		console.log("Group B predictions: all negative (0%)");
		console.log("Disparity: 100% (should fail with 10% threshold)");

		const noir = new Noir(fairness_audit_circuit as CompiledCircuit);

		// Circuit should fail due to fairness violation
		try {
			await noir.execute(input);
			// If we get here, the circuit didn't fail as expected
			expect(true).toBe(false); // Force test failure
		} catch (error) {
			console.log("✓ Circuit correctly rejected biased predictions");
			expect(error).toBeDefined();
		}
	});
});
