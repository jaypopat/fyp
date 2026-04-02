use dep::poseidon::poseidon;
use dep::common::{
    compute_merkle_root, predict_linear_classifier,
    NUM_WEIGHTS, NUM_FEATURES, MAX_DATASET_SIZE, MAX_TREE_HEIGHT, THRESHOLD_SCALE,
};

fn main(
    // private inputs
    _model_weights: [Field; NUM_WEIGHTS],
    _dataset_size: u32,
    _dataset_features: [Field; NUM_FEATURES * MAX_DATASET_SIZE],
    _dataset_labels: [Field; MAX_DATASET_SIZE],
    _dataset_sensitive_attrs: [Field; MAX_DATASET_SIZE],
    _dataset_salts: [Field; MAX_DATASET_SIZE],
    _merkle_paths: [[Field; MAX_TREE_HEIGHT]; MAX_DATASET_SIZE],
    _is_even_flags: [[bool; MAX_TREE_HEIGHT]; MAX_DATASET_SIZE],
    _merkle_depth: u32,
    // public inputs
    _weights_hash: pub Field,
    _dataset_merkle_root: pub Field,
    _fairness_threshold_epsilon: pub Field,
) {
    // Verify model weights commitment
    let computed_weights_hash = poseidon::bn254::hash_15(_model_weights);
    assert(computed_weights_hash == _weights_hash);

    // Verify dataset Merkle root
    for i in 0..MAX_DATASET_SIZE {
        if i < _dataset_size {
            let mut row_with_salt: [Field; 16] = [0; 16];

            for j in 0..NUM_FEATURES {
                row_with_salt[j] = _dataset_features[i * NUM_FEATURES + j];
            }
            row_with_salt[14] = _dataset_labels[i];
            row_with_salt[15] = _dataset_salts[i];

            let leaf_hash = poseidon::bn254::hash_16(row_with_salt);
            let computed_root = compute_merkle_root(
                leaf_hash,
                _merkle_paths[i],
                _is_even_flags[i],
                _merkle_depth,
            );

            assert(computed_root == _dataset_merkle_root);
        }
    }

    // Fairness computation
    let mut group_a_positive_pred: u32 = 0;
    let mut group_a_total: u32 = 0;
    let mut group_b_positive_pred: u32 = 0;
    let mut group_b_total: u32 = 0;

    for i in 0..MAX_DATASET_SIZE {
        if i < _dataset_size {
            let mut features: [Field; NUM_FEATURES] = [0; NUM_FEATURES];
            for j in 0..NUM_FEATURES {
                features[j] = _dataset_features[i * NUM_FEATURES + j];
            }

            let prediction = predict_linear_classifier(_model_weights, features);

            let is_group_a = _dataset_sensitive_attrs[i] == 0;

            if is_group_a {
                group_a_total += 1;
                if prediction == 1 {
                    group_a_positive_pred += 1;
                }
            } else {
                group_b_total += 1;
                if prediction == 1 {
                    group_b_positive_pred += 1;
                }
            }
        }
    }

    assert(group_a_total > 0);
    assert(group_b_total > 0);

    // Compute fairness metric (demographic parity)
    let rate_a_scaled: u32 = group_a_positive_pred * THRESHOLD_SCALE / group_a_total;
    let rate_b_scaled: u32 = group_b_positive_pred * THRESHOLD_SCALE / group_b_total;

    let disparity_scaled: u32 = if rate_a_scaled > rate_b_scaled {
        rate_a_scaled - rate_b_scaled
    } else {
        rate_b_scaled - rate_a_scaled
    };

    // Assert fairness threshold
    let threshold_scaled: u32 = (_fairness_threshold_epsilon as u32) * 100;

    assert(disparity_scaled <= threshold_scaled);
}
