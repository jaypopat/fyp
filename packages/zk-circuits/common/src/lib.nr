use dep::poseidon::poseidon;

global NUM_WEIGHTS: u32 = 15;
global NUM_FEATURES: u32 = 14;
global MAX_DATASET_SIZE: u32 = 10;
global MAX_TREE_HEIGHT: u32 = 15;
global THRESHOLD_SCALE: u32 = 10000;

// Logistic regression prediction
pub fn predict_logistic_regression(
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
