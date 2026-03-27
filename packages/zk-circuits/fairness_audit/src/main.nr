use dep::poseidon::poseidon;
use dep::common::{
    predict_linear_classifier,
    NUM_WEIGHTS, NUM_FEATURES, THRESHOLD_SCALE,
};

// Circuit constants specific to fairness audit
global SAMPLE_SIZE: u32 = 10;
global TREE_DEPTH: u32 = 7;

/// Fairness Audit Circuit
///
/// Proves that a sample of queries from a committed batch
/// demonstrates fair model behavior across demographic groups.
///
/// The prover (provider) must show:
/// 1. Each sampled query is included in the committed batch (Merkle proof)
/// 2. The model predictions on these queries are correct (re-run inference)
/// 3. The predictions meet the fairness threshold
/// 4. The weights used match the certified model
fn main(
    // ===== PRIVATE INPUTS =====
    _model_weights: [Field; NUM_WEIGHTS],
    _sample_count: u32,
    _sample_valid: [bool; SAMPLE_SIZE],
    _sample_features: [Field; NUM_FEATURES * SAMPLE_SIZE],
    _sample_sensitive_attrs: [Field; SAMPLE_SIZE],
    // Merkle proofs for each sampled query in the batch tree
    _merkle_proofs: [[Field; TREE_DEPTH]; SAMPLE_SIZE],
    _merkle_path_indices: [[bool; TREE_DEPTH]; SAMPLE_SIZE],
    _merkle_depth: u32,
    // ===== PUBLIC INPUTS =====
    _batch_merkle_root: pub Field,
    _weights_hash: pub Field,
    _fairness_threshold_epsilon: pub Field,
) {
    // === Step 0: Validate sample count matches validity mask ===
    let mut valid_count: u32 = 0;
    for i in 0..SAMPLE_SIZE {
        if _sample_valid[i] {
            valid_count += 1;
        }
    }
    assert(valid_count == _sample_count);
    assert(_sample_count > 0);

    // === Step 1: Verify model weights commitment ===
    let computed_weights_hash = poseidon::bn254::hash_15(_model_weights);
    assert(computed_weights_hash == _weights_hash);

    // === Step 2: For each valid sample, verify prediction and Merkle inclusion ===
    let mut sample_predictions: [Field; SAMPLE_SIZE] = [0; SAMPLE_SIZE];

    for i in 0..SAMPLE_SIZE {
        if _sample_valid[i] {
            // Extract features for this sample
            let mut features: [Field; NUM_FEATURES] = [0; NUM_FEATURES];
            for j in 0..NUM_FEATURES {
                features[j] = _sample_features[i * NUM_FEATURES + j];
            }

            // Re-run inference to get verified prediction
            let prediction = predict_linear_classifier(_model_weights, features);
            sample_predictions[i] = prediction;

            // Build leaf: hash(features || prediction || sensitive_attr)
            let mut leaf_data: [Field; NUM_FEATURES + 2] = [0; NUM_FEATURES + 2];
            for j in 0..NUM_FEATURES {
                leaf_data[j] = features[j];
            }
            leaf_data[NUM_FEATURES] = prediction;
            leaf_data[NUM_FEATURES + 1] = _sample_sensitive_attrs[i];

            // Hash in chunks (16 elements = 2 x poseidon8)
            let hash1 = poseidon::bn254::hash_8([
                leaf_data[0],
                leaf_data[1],
                leaf_data[2],
                leaf_data[3],
                leaf_data[4],
                leaf_data[5],
                leaf_data[6],
                leaf_data[7],
            ]);
            let hash2 = poseidon::bn254::hash_8([
                leaf_data[8],
                leaf_data[9],
                leaf_data[10],
                leaf_data[11],
                leaf_data[12],
                leaf_data[13],
                leaf_data[14],
                leaf_data[15],
            ]);
            let leaf_hash = poseidon::bn254::hash_2([hash1, hash2]);

            // Compute Merkle root from leaf and proof (depth-controlled, no zero-sentinel)
            let mut current_hash = leaf_hash;
            for j in 0..TREE_DEPTH {
                if j < _merkle_depth {
                    let (left, right) = if _merkle_path_indices[i][j] {
                        (current_hash, _merkle_proofs[i][j])
                    } else {
                        (_merkle_proofs[i][j], current_hash)
                    };
                    current_hash = poseidon::bn254::hash_2([left, right]);
                }
            }

            assert(current_hash == _batch_merkle_root);
        }
    }

    // === Step 3: Compute fairness metric on valid samples ===
    let mut group_a_positive: u32 = 0;
    let mut group_a_total: u32 = 0;
    let mut group_b_positive: u32 = 0;
    let mut group_b_total: u32 = 0;

    for i in 0..SAMPLE_SIZE {
        if _sample_valid[i] {
            let is_group_a = _sample_sensitive_attrs[i] == 0;
            let is_positive = sample_predictions[i] == 1;

            if is_group_a {
                group_a_total += 1;
                if is_positive {
                    group_a_positive += 1;
                }
            } else {
                group_b_total += 1;
                if is_positive {
                    group_b_positive += 1;
                }
            }
        }
    }

    // === Step 4: Assert fairness threshold ===
    // Both groups must have representation to measure disparity
    assert(group_a_total > 0);
    assert(group_b_total > 0);

    let rate_a_scaled: u32 = group_a_positive * THRESHOLD_SCALE / group_a_total;
    let rate_b_scaled: u32 = group_b_positive * THRESHOLD_SCALE / group_b_total;

    let disparity_scaled: u32 = if rate_a_scaled > rate_b_scaled {
        rate_a_scaled - rate_b_scaled
    } else {
        rate_b_scaled - rate_a_scaled
    };

    let threshold_scaled: u32 = (_fairness_threshold_epsilon as u32) * 100;

    assert(disparity_scaled <= threshold_scaled);
}
