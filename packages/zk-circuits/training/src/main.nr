use dep::poseidon::poseidon;

global NUM_WEIGHTS: u32 = 15;
global NUM_FEATURES: u32 = 14;
global MAX_DATASET_SIZE: u32 = 10;
global MAX_TREE_HEIGHT: u32 = 15;
global THRESHOLD_SCALE: u32 = 10000;

fn main(
    // ===== PRIVATE INPUTS =====
    _model_weights: [Field; NUM_WEIGHTS],
    _dataset_size: u32,
    _dataset_features: [Field; NUM_FEATURES * MAX_DATASET_SIZE],
    _dataset_labels: [Field; MAX_DATASET_SIZE],
    _dataset_sensitive_attrs: [Field; MAX_DATASET_SIZE],
    _threshold_group_a: Field,
    _threshold_group_b: Field,
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
    for i in 0..MAX_DATASET_SIZE {
        if i < _dataset_size {
            let mut row_with_salt: [Field; 16] = [0; 16];
            
            for j in 0..NUM_FEATURES {
                row_with_salt[j] = _dataset_features[i * NUM_FEATURES + j];
            }
            row_with_salt[14] = _dataset_labels[i];
            row_with_salt[15] = _dataset_salts[i];

            let leaf_hash = poseidon::bn254::hash_16(row_with_salt);
            let computed_root = compute_merkle_root(leaf_hash, _merkle_paths[i], _is_even_flags[i]);
            
            assert(computed_root == _dataset_merkle_root);
        }
    }

    // === Step 3: Fairness computation ===
    let mut group_a_positive_pred: u32 = 0;
    let mut group_a_total: u32 = 0;
    let mut group_b_positive_pred: u32 = 0;
    let mut group_b_total: u32 = 0;

    for i in 0..MAX_DATASET_SIZE {
        if i < _dataset_size {
            // Extract features for this row
            let mut features: [Field; NUM_FEATURES] = [0; NUM_FEATURES];
            for j in 0..NUM_FEATURES {
                features[j] = _dataset_features[i * NUM_FEATURES + j];
            }

            let prediction = predict_logistic_regression(_model_weights, features);
            
            // Count by sensitive attribute
            let is_group_a = _dataset_sensitive_attrs[i] == 0;  // Assuming 0 = group A, 1 = group B
            
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
    
    // === Step 4: Compute fairness metric (demographic parity) ===
    // Positive rate for group A: (group_a_positive_pred / group_a_total) * THRESHOLD_SCALE


    let rate_a_scaled: u32 = group_a_positive_pred * THRESHOLD_SCALE / group_a_total;
    
    // Positive rate for group B: (group_b_positive_pred / group_b_total) * THRESHOLD_SCALE
    let rate_b_scaled: u32 = group_b_positive_pred * THRESHOLD_SCALE / group_b_total;

    // Compute absolute disparity: rate_a - rate_b
    let disparity_scaled: u32 = if rate_a_scaled > rate_b_scaled {
        rate_a_scaled - rate_b_scaled
    } else {
        rate_b_scaled - rate_a_scaled
    };

    // === Step 5: Assert fairness threshold ===
    // Convert _fairness_threshold_epsilon from percentage to scaled value
    // e.g., if threshold is 10% -> 10 * 100 = 1000 (out of THRESHOLD_SCALE=10000)
    let threshold_scaled: u32 = (_fairness_threshold_epsilon as u32) * 100;
    
    assert(disparity_scaled <= threshold_scaled);
}

// Logistic regression prediction
fn predict_logistic_regression(
    weights: [Field; NUM_WEIGHTS],
    features: [Field; NUM_FEATURES],
) -> Field {
    let mut logit = weights[0];
    
    for i in 0..NUM_FEATURES {
        logit = logit + weights[i + 1] * features[i];
    }
    
    if (logit as i64) > 0 {
        1
    } else {
        0
    }
}


pub fn compute_merkle_root(
    leaf: Field,
    merkle_proof: [Field; MAX_TREE_HEIGHT],
    is_even: [bool; MAX_TREE_HEIGHT],
) -> Field {
    let mut hash: Field = leaf;

    for i in 0..MAX_TREE_HEIGHT {
        if merkle_proof[i] != 0 {
            let (left, right) = if is_even[i] {
                (hash, merkle_proof[i])
            } else {
                (merkle_proof[i], hash)
            };
            hash = poseidon::bn254::hash_2([left, right]);
        }
    }

    hash
}
