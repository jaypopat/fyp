This package contains all the ZK Circuits needed for the OATH Framework implementation

## Oath (Zero-Knowledge ML Fairness Framework) has two major proof phases:

### Training Certification Circuit
→ Proves that the dataset used for training matches a committed dataset, i.e. the training wasn’t tampered with.
→ It shows that the committed dataset (hash or Merkle root) corresponds to the dataset actually used for model training.

### Fairness Audit Circuit
→ Proves that a random sample of data (from that same commitment) satisfies a fairness metric below some threshold.
