# zkfair CLI

A command-line tool for generating and verifying **zero-knowledge proofs of AI model fairness**—register models, commit datasets and weights, generate and submit proofs, and verify both on-chain or locally.

***

## 🚀 Quick Start

```bash
bun install         # Install dependencies
bun run build           # Build the CLI
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
  ```

***

### commit

- **Commit dataset & model weights**
  ```
  zkfair commit --model <model.onnx> --data <dataset.csv> --schema <schema.json> --name "Model Name" --description "Desc" --out salts.json
  ```
  **Options:**
  - `--model, -m <path>` *(required)*: Model file path
  - `--data, -d <path>` *(required)*: Dataset file path
  - `--schema, -s <path>`: Schema JSON (recommended)
  - `--name, -n <string>`: Model name
  - `--description, -D <string>`: Model description
  - `--out, -o <path>` *(required)*: Output salts JSON

***

### proof

- **Prove model bias**
  ```
  zkfair proof proveModelBias --model <model.onnx> --data <test.csv> --attributes gender,age --name "Model" --description "..." --out salts.json
  ```
  **Options:**
    - `--model, -m <path>` *(required)*
    - `--data, -d <path>` *(required)*
    - `--attributes, -a <comma,list>` *(required)*
    - `--name, -n <string>`
    - `--description, -D <string>`
    - `--schema, -s <path>`
    - `--out, -o <path>`

- **Get proof status**
  ```
  zkfair proof status <proof-hash>
  zkfair proof status --model <model.onnx>
  ```
  **Options:**
    - `<proof-hash>`: Proof hash to check
    - `--model <path>`: Model file to derive proof hash

***

### verify

- **Verify a proof**
  ```
  zkfair verify --model <model.onnx> --public-inputs <inputs.json> --local
  zkfair verify --proof-hash <hash> --public-inputs <val1,val2,...>
  ```
  **Options:**
    - `--model, -m <path>`
    - `--proof-hash <hash>`
    - `--public-inputs <data>` *(required)* (comma-separated or JSON file)
    - `--local`: Verify locally (optional; default is onchain)

***

## 💡 Example Workflow

```bash
# 1. Commit
zkfair commit --model my_model.onnx --data train.csv --schema schema.json --out salts.json

# 2. Prove fairness
zkfair proof proveModelBias --model my_model.onnx --data test.csv --attributes gender,age --name "FairNet" --description "A fair model" --out proof_salts.json

# 3. Get proof status
zkfair proof status <proof-hash>

# 4. Verify proof
zkfair verify --proof-hash <hash> --public-inputs inputs.json --local

# 5. List and view models
zkfair model list
zkfair model get <model-hash>
```

***

## 🔎 Notes

- **Salts**: Kept private (required for proof generation, not published on-chain)
- **Commitments & Metadata**: Published on-chain for transparency
- **Proof verification**: Supported both on-chain and offline (dev)
- **All options**: Shown via `--help` on any command
