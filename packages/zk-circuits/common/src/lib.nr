use dep::poseidon::poseidon;

pub global NUM_WEIGHTS: u32 = 15;
pub global NUM_FEATURES: u32 = 14;
pub global MAX_DATASET_SIZE: u32 = 10;
pub global MAX_TREE_HEIGHT: u32 = 15;
pub global THRESHOLD_SCALE: u32 = 10000;

// Linear classifier prediction (step function at logit=0)
// Equivalent to logistic regression with threshold=0.5 on the sigmoid,
// since sigmoid(0) = 0.5, and logit > 0 iff sigmoid(logit) > 0.5.
pub fn predict_linear_classifier(
    weights: [Field; NUM_WEIGHTS],
    features: [Field; NUM_FEATURES],
) -> Field {
    let mut logit = weights[0];

    for i in 0..NUM_FEATURES {
        logit = logit + weights[i + 1] * features[i];
    }

    if (logit as i64) > 0 { 1 } else { 0 }
}

// Compute Merkle root from a leaf hash and proof.
// `proof_depth` controls how many levels to traverse (must be <= MAX_TREE_HEIGHT).
// `is_even[i]` indicates whether the current node is the left child at level i.
pub fn compute_merkle_root(
    leaf: Field,
    merkle_proof: [Field; MAX_TREE_HEIGHT],
    is_even: [bool; MAX_TREE_HEIGHT],
    proof_depth: u32,
) -> Field {
    let mut hash: Field = leaf;

    for i in 0..MAX_TREE_HEIGHT {
        if i < proof_depth {
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
