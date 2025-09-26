# zkfair CLI

A command-line tool for generating and verifying **zero-knowledge proofs of AI model fairness**—register models, commit datasets and weights, generate and submit proofs, and verify both on-chain or locally.

***

## 🚀 Quick Start

```
bun install         # Install dependencies
bun run build       # Build the CLI
./zkfair --help
```

***

## 🛠️ Commands & Options

### model

- **List all models**
  ```
  zkfair model list
  ```
- **Get model details**
  ```
  zkfair model get <model-hash>
  zkfair model get --weights <weights.json>
  ```
  **Options:**
  - `<model-hash>`: Hash of the model weights to retrieve
  - `--weights, -w <path>`: Path to weights JSON file (alternative to hash)

***

### commit

- **Commit dataset & model weights**
  ```
  zkfair commit --weights <weights.json> --data <dataset.csv> --schema <schema.json> --name "Model Name" --description "Desc" --out salts.json
  ```
  **Options:**
  - `--weights, -w <path>` *(required)*: Model weights JSON file path
  - `--data, -d <path>` *(required)*: Dataset file path
  - `--schema, -s <path>`: Schema JSON (recommended)
  - `--name, -n <string>` *(required)*: Model name
  - `--description, -D <string>` *(required)*: Model description
  - `--out, -o <path>` *(required)*: Output salts JSON

***

### proof

- **Prove model bias**
  ```
  zkfair proof proveModelBias --weights <weights.json> --data <test.csv> --attributes gender,age --name "Model" --description "..." --out salts.json
  ```
  **Options:**
    - `--weights, -w <path>` *(required)*: Model weights JSON file path
    - `--data, -d <path>` *(required)*: Dataset file path
    - `--attributes, -a <comma,list>` *(required)*: Protected attributes
    - `--name, -n <string>` *(required)*: Model name
    - `--description, -D <string>` *(required)*: Model description
    - `--schema, -s <path>`: Dataset schema JSON (optional)
    - `--out, -o <path>`: Output salts JSON file (optional)

- **Get proof status**
  ```
  zkfair proof status <proof-hash>
  zkfair proof status <weights.json>
  ```
  **Options:**
    - `<proof-hash>`: Proof hash to check
    - `<weights.json>`: Weights JSON file to derive proof hash from

***

### verify

- **Verify a proof**
  ```
  zkfair verify --weights <weights.json> --public-inputs <inputs.json> --local
  zkfair verify --proof-hash <hash> --public-inputs <val1,val2,...>
  ```
  **Options:**
    - `--weights, -w <path>`: Model weights JSON file path
    - `--proof-hash <hash>`: Specific proof hash to verify
    - `--public-inputs <data>` *(required)*: Comma-separated values or JSON file path
    - `--local`: Verify locally (optional; default is onchain)

***

## 💡 Example Workflow

```
# 1. Train model and export weights
python train_model.py --dataset train.csv --output weights.json

# 2. Commit weights and dataset
zkfair commit --weights weights.json --data train.csv --schema schema.json --name "FairNet" --description "A fair classification model" --out salts.json

# 3. Prove fairness
zkfair proof proveModelBias --weights weights.json --data test.csv --attributes gender,age --name "FairNet" --description "Bias testing" --out proof_salts.json

# 4. Get proof status
zkfair proof status <proof-hash>

# 5. Verify proof
zkfair verify --proof-hash <hash> --public-inputs inputs.json --local

# 6. List and view models
zkfair model list
zkfair model get <model-hash>
```

***

## 📄 Weights JSON Format

The weights JSON file should contain the model parameters in this format:

```
{
  "metadata": {
    "model_type": "RandomForestClassifier",
    "framework": "scikit-learn",
    "n_features": 10,
    "n_classes": 2,
    "feature_names": ["age", "income", "education", "..."]
  },
  "weights": {
    "trees": [
      {
        "tree_id": 0,
        "feature": [0, 1, -1, 2, -1, -1],
        "threshold": [0.5, 1000, -2, 12, -2, -2],
        "value": [[], [], [], [], [], []],
        "children_left": [1, 2, -1, 4, -1, -1],
        "children_right": [3, 5, -1, -1, -1, -1]
      }
    ]
  }
}
```

***

## 🔎 Notes

- **Salts**: Kept private (required for proof generation, not published on-chain)
- **Commitments & Metadata**: Published on-chain for transparency
- **Proof verification**: Supported both on-chain and offline (dev)
- **Weights format**: JSON format allows easy integration with any ML framework
- **All options**: Shown via `--help` on any command