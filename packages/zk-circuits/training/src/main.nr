use dep::poseidon::poseidon;

global NUM_WEIGHTS: u32 = 15;
global NUM_FEATURES: u32 = 14;
global MAX_DATASET_SIZE: u32 = 10; // Start small for testing - 32561 is way too large!
global MAX_TREE_HEIGHT: u32 = 15;
global THRESHOLD_SCALE: Field = 10000; // Fixed-point scaling factor for thresholds

fn main(
    // ===== PRIVATE INPUTS =====
    _model_weights: [Field; NUM_WEIGHTS],
    _dataset_size: u32,
    _dataset_features: [Field; NUM_FEATURES * MAX_DATASET_SIZE],
    _dataset_labels: [Field; MAX_DATASET_SIZE],
    _dataset_sensitive_attrs: [Field; MAX_DATASET_SIZE],
    _threshold_group_a: Field, // Scaled positive integer (abs value * THRESHOLD_SCALE)
    _threshold_group_b: Field, // Scaled positive integer (abs value * THRESHOLD_SCALE)
    _dataset_salts: [Field; MAX_DATASET_SIZE],
    _merkle_paths: [[Field; MAX_TREE_HEIGHT]; MAX_DATASET_SIZE],
    _is_even_flags: [[bool; MAX_TREE_HEIGHT]; MAX_DATASET_SIZE],
    // ===== PUBLIC INPUTS =====
    _weights_hash: pub Field,
    _dataset_merkle_root: pub Field,
    _fairness_threshold_epsilon: pub Field,
) {
    // === Step 1: Verify model weights commitment ===
    let computed_weights_hash = poseidon::bn254::hash_15(_model_weights);

    assert(computed_weights_hash == _weights_hash);

    // === Step 2: Verify dataset Merkle root ===
    // Use fixed-size loop with conditional execution
    for i in 0..MAX_DATASET_SIZE {
        if i < _dataset_size {
            // Reconstruct row leaf
            let mut row_with_salt: [Field; 16] = [0; 16];

            for j in 0..NUM_FEATURES {
                row_with_salt[j] = _dataset_features[i * NUM_FEATURES + j];
            }
            row_with_salt[14] = _dataset_labels[i];
            row_with_salt[15] = _dataset_salts[i];

            let leaf_hash = poseidon::bn254::hash_16(row_with_salt);

            // Verify Merkle proof
            let computed_root = compute_merkle_root(leaf_hash, _merkle_paths[i], _is_even_flags[i]);

            assert(computed_root == _dataset_merkle_root);
        }
    }
}
pub fn compute_merkle_root(
    leaf: Field,
    merkle_proof: [Field; MAX_TREE_HEIGHT], // MAX_TREE_HEIGHT siblings
    is_even: [bool; MAX_TREE_HEIGHT], // Position flags for each level
) -> Field {
    let mut hash: Field = leaf;

    for i in 0..MAX_TREE_HEIGHT {
        // Stop when we hit a zero sibling (padding for smaller trees)
        if merkle_proof[i] != 0 {
            let (left, right) = if is_even[i] {
                (hash, merkle_proof[i]) // Current is left, sibling is right
            } else {
                (merkle_proof[i], hash) // Sibling is left, current is right
            };

            // Hash with original Poseidon
            hash = poseidon::bn254::hash_2([left, right]);
        }
    }

    hash
}
