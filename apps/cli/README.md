# zkfair CLI

`zkfair` is a command-line tool for generating and submitting **zero-knowledge proofs of model fairness**.
It allows you to commit datasets and model weights, register models, generate ZK proofs of fairness, submit them on-chain, and verify them locally or on-chain.

---

## Features

- Commit datasets and model weights (Merkle commitments)
- Register and manage ML models (with metadata)
- Generate ZK proofs of fairness (bias metrics)
- Submit proofs on-chain
- Verify proofs **on-chain or locally**
- Query proof status

---

## Installation

```bash
# Install dependencies
bun install
````

Run using Bun:

```bash
bun run src/index.ts <command>
```

Or package an executable:

```bash
bun run build
./zkfair <command>
```

---

## CLI Structure

The CLI is organized into **three main command groups**:

* `commit` — dataset & weights commitments
* `model` — model registration & management
* `proof` — proof generation, verification, and status

---

## 1️⃣ Commit Commands

### Commit a dataset

Generate a Merkle root for your dataset and store per-row salts locally (private).

```bash
zkfair commit dataset \
  --data ./datasets/train.csv \
  --schema ./schemas/train_schema.json \
  --out .zkfair/salts.json
```

**Options**

* `--data, -d <path>` — path to dataset (CSV/JSON)
* `--schema, -s <path>` — dataset schema JSON file
* `--out, -o <path>` — output salts JSON file (kept private)

---

### Commit model weights

Generate a hash commitment for model weights, store salt locally.

```bash
zkfair commit weights \
  --model ./models/my_model.onnx \
  --out .zkfair/weights_salt.json
```

**Options**

* `--model, -m <path>` — path to model file
* `--out, -o <path>` — output salts JSON file (kept private)

---

## 2️⃣ Model Commands

### List all registered models

```bash
zkfair model list
```

### Get details of a specific model

```bash
zkfair model get <model-hash>
```

**Notes:**

* The `model-hash` is derived from the model weight commitment.
* Metadata stored on-chain includes name, description, protected attributes, and verified status.

---

## 3️⃣ Proof Commands

### Generate and submit a ZK fairness proof

This wraps the full workflow: register model if not already, calculate bias metrics, generate proof, and submit on-chain.

```bash
zkfair proof prove-model-bias \
  -m ./models/my_model.onnx \
  -d ./datasets/test.csv \
  -a gender,age \
  -n "Loan Approval Model" \
  -D "Predicts loan approval"
```

**Options**

* `-m, --model <path>` — path to model file (required)
* `-d, --data <path>` — path to dataset file (required)
* `-a, --attributes <list>` — comma-separated protected attributes (required)
* `-n, --name <string>` — human-readable model name
* `-D, --description <string>` — model description

---

### Verify a proof

Verify a proof **on-chain** (default) or **locally** (`--local`).

```bash
# Local verification
zkfair proof verify <proof-hash> <public-inputs> --local

# On-chain verification
zkfair proof verify <proof-hash> <public-inputs>
```

**Notes:**

* `<public-inputs>` can be a comma-separated list or a JSON file path containing the inputs for the proof.

---

### Check proof status

```bash
zkfair proof status <proof-hash>
```

---

## Example Full Workflow

1. **Commit dataset and weights locally**

```bash
zkfair commit dataset --data ./train.csv --schema ./schema.json --out .zkfair/salts.json
zkfair commit weights --model ./model.onnx --out .zkfair/weights_salt.json
```

2. **Generate and submit ZK proof**

```bash
zkfair proof prove-model-bias \
  -m ./model.onnx \
  -d ./test.csv \
  -a gender,age \
  -n "Loan Model" \
  -D "Loan approval predictions"
```

3. **Verify locally**

```bash
zkfair proof verify <proof-hash> <public-inputs.json> --local
```

4. **Check on-chain proof status**

```bash
zkfair proof status <proof-hash>
```

5. **Query model metadata**

```bash
zkfair model list
zkfair model get <model-hash>
```

---

## Notes

* **Salts** are stored locally and **never published on-chain**. They are needed for generating proofs but are sensitive.
* **Commitments** (Merkle root for dataset, hash of weights) are published on-chain.
* **Metadata** (name, description, protected attributes) is stored on-chain for discoverability.
* For richer queries or search, consider using an **off-chain indexer** later.
* CLI is structured to clearly separate **commit**, **model**, and **proof** workflows.

---

## JSON Examples

### `schema.json`

```json
{
  "columns": [
    { "name": "age", "type": "int" },
    { "name": "gender", "type": "string" },
    { "name": "income", "type": "float" },
    { "name": "label", "type": "int" }
  ]
}
```

### `salts.json`

```json
{
  "rows": {
    "0": "0xabc123...",
    "1": "0xdef456...",
    "2": "0x789abc..."
  }
}
```
