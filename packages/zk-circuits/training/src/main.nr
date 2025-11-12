use dep::poseidon::poseidon2;

global NUM_WEIGHTS: u32 = 14;
global NUM_FEATURES: u32 = 14;
global MAX_DATASET_SIZE: u32 = 1200;
global MAX_TREE_HEIGHT: u32 = 11;

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
    
    // ===== PUBLIC INPUTS =====
    _weights_hash: pub Field,
    _dataset_merkle_root: pub Field,
    _fairness_threshold_epsilon: pub Field,
) {
    // === Step 1: Verify model weights commitment ===
    let computed_weights_hash = poseidon2::Poseidon2::hash(
        _model_weights, 
        NUM_WEIGHTS
    );
    assert(computed_weights_hash == _weights_hash);

    // === Step 2: Build Merkle tree from dataset ===
    let mut leaves: [Field; MAX_DATASET_SIZE] = [0; MAX_DATASET_SIZE];
    
    // Hash each dataset entry into a leaf
    for i in 0.._dataset_size {
        leaves[i] = hash_dataset_entry(
            _dataset_features,
            _dataset_labels[i],
            _dataset_sensitive_attrs[i],
            _dataset_salts[i],
            i
        );
    }
    
    // Compute Merkle root from leaves
    let computed_root = build_merkle_root(leaves, _dataset_size);
    assert(computed_root == _dataset_merkle_root);

    // === Step 3: Compute fairness metrics ===
    let mut group_a_positive: Field = 0;
    let mut group_a_total: Field = 0;
    let mut group_b_positive: Field = 0;
    let mut group_b_total: Field = 0;

    for i in 0.._dataset_size {
        // Compute logistic regression prediction
        let mut score: Field = 0;
        for j in 0..NUM_FEATURES {
            let feature_idx = (i * NUM_FEATURES) + j;
            score += _model_weights[j] * _dataset_features[feature_idx];
        }
        score += _model_weights[NUM_WEIGHTS - 1]; // intercept
        
        // Apply group-specific threshold
        let threshold = if _dataset_sensitive_attrs[i] == 0 {
            _threshold_group_a
        } else {
            _threshold_group_b
        };
        
        // Use Field.lt() method for comparison
        let prediction = if threshold.lt(score) { 
            Field::from(1)
        } else { 
            Field::from(0)
        };
        
        // Constrain the prediction by checking it's binary
        assert((prediction == 0) | (prediction == 1));
        
        // Count predictions per group
        if _dataset_sensitive_attrs[i] == 0 {
            group_a_total += 1;
            group_a_positive += prediction;
        } else {
            group_b_total += 1;
            group_b_positive += prediction;
        }
    }

    // === Step 4: Verify demographic parity ===
    // |P(Y=1|S=0) - P(Y=1|S=1)| <= epsilon
    // To avoid division: |rate_a * total_b - rate_b * total_a| <= epsilon * total_a * total_b
    let cross_product_a = group_a_positive * group_b_total;
    let cross_product_b = group_b_positive * group_a_total;
    
    // Use Field.lt() for comparison
    let cross_product_diff = if cross_product_b.lt(cross_product_a) {
        cross_product_a - cross_product_b
    } else {
        cross_product_b - cross_product_a
    };
    
    let threshold_scaled = _fairness_threshold_epsilon * group_a_total * group_b_total;
    
    // Verify fairness constraint using lt()
    // cross_product_diff <= threshold_scaled means !(threshold_scaled < cross_product_diff)
    let fairness_violated = threshold_scaled.lt(cross_product_diff);
    assert(fairness_violated == false);
}

// Hash a single dataset entry (leaf)
fn hash_dataset_entry(
    features: [Field; NUM_FEATURES * MAX_DATASET_SIZE],
    label: Field,
    sensitive_attr: Field,
    salt: Field,
    index: u32
) -> Field {
    // Combine: [feature0, feature1, ..., feature13, label, sensitive_attr, salt]
    let mut entry: [Field; NUM_FEATURES + 3] = [0; NUM_FEATURES + 3];
    
    for i in 0..NUM_FEATURES {
        let feature_idx = (index * NUM_FEATURES) + i;
        entry[i] = features[feature_idx];
    }
    entry[NUM_FEATURES] = label;
    entry[NUM_FEATURES + 1] = sensitive_attr;
    entry[NUM_FEATURES + 2] = salt;
    
    poseidon2::Poseidon2::hash(entry, NUM_FEATURES + 3)
}

// Build Merkle root from leaves with fixed iterations
fn build_merkle_root(
    leaves: [Field; MAX_DATASET_SIZE], 
    size: u32
) -> Field {
    let mut current_level = leaves;
    let mut current_size = size;
    
    // Fixed iteration count - maximum tree height
    for _level in 0..MAX_TREE_HEIGHT {
        // Stop when we reach the root (no break needed)
        if current_size <= 1 {
            current_level = current_level;  // No-op to satisfy type checker
        } else {
            let mut next_level: [Field; MAX_DATASET_SIZE] = [0; MAX_DATASET_SIZE];
            let next_size = (current_size + 1) / 2;
            
            for i in 0..MAX_DATASET_SIZE {
                if i < next_size {
                    let left_idx = i * 2;
                    let right_idx = left_idx + 1;
                    
                    if right_idx < current_size {
                        // Hash pair
                        next_level[i] = poseidon2::Poseidon2::hash(
                            [current_level[left_idx], current_level[right_idx]], 
                            2
                        );
                    } else {
                        // Odd node, promote as-is
                        next_level[i] = current_level[left_idx];
                    }
                }
            }
            
            current_level = next_level;
            current_size = next_size;
        }
    }
    
    current_level[0]
}
