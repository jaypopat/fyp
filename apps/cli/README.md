# zkfair CLI

Command-line interface for registering models, committing datasets & weights, generating fairness proofs, and verifying them on-chain or locally.

---

## ✨ Features
- Register model + dataset commitments (on-chain)
- Generate (WIP) & submit fairness proofs
- Query model & proof status
- Verify proofs locally (developer mode) or on-chain

---

## 🚀 Quick Start

```bash
bun install            # Install dependencies
bun run build          # Compile to a native binary (./zkfair)
./zkfair --help        # Top-level help
./zkfair model --help  # Command group help
```

The build step emits a binary named `zkfair` in this directory.

---

## ⚙️ Environment
Create a `.env` (see `.env.example`):

```
RPC_URL=<your_json_rpc_endpoint>
PRIVATE_KEY=<hex_private_key>
CONTRACT_ADDRESS=<deployed_zkfair_contract>
```

All on-chain actions (commit, register) require these values. Local verification (`--local`) does not require RPC or private key.

Load automatically via Bun (it reads `.env` on start) or export them in your shell.

---

## 🧭 Command Structure

Grouped where multiple actions exist (`model`, `proof`), flattened where there is only one action (`commit`, `verify`).

```
zkfair model list
zkfair model get <model-hash | --weights path>

zkfair proof prove-model-bias   ...options
zkfair proof status <proof-hash | weights-path>

zkfair commit  ...options
zkfair verify  <proof-hash | --weights path> <public-inputs>
```

> NOTE: The duplicated names (`commit commit`, `verify verify`) come from the current internal command grouping. This may be simplified later (e.g. exposing them directly) but reflects the present code in `commands/`.

Run `--help` after any group or subcommand for contextual help.

---

## 🛠 Commands & Options

### model

List all registered models:
```bash
zkfair model list
```

Get a model (by hash or by recomputing from a weights file):
```bash
zkfair model get 0xabc123...
zkfair model get --weights ./weights.bin
```
Options:
- `model-hash` positional: On-chain weights commitment
- `--weights, -w <path>`: Path to a weights file to hash locally

---

### commit

Create on-chain commitments for a model's weights + dataset.

**Option 1: Using Directory Convention (Recommended)**
```bash
zkfair commit --dir ./examples/adult-income
```

The CLI expects the directory to contain:
- `weights.bin` - Model weights (required)
- `dataset.csv` - Training dataset (required)
- `fairness_threshold.json` - Fairness configuration (required)
- `model.json` (optional) - Model metadata (name, description, creator)

**Note:** Salt generation is handled automatically by the CLI. A deterministic master salt is generated from your model files and cached in `~/.zkfair/<weights-hash>/` for proof generation. The same model files will always produce the same commitment.

**Option 2: Using Explicit Paths**
```bash
zkfair commit \
  --weights weights.bin \
  --data dataset.csv \
  --fairness-threshold fairness_threshold.json \
  --name "Adult Income Predictor" \
  --description "Binary classifier for income prediction" \
  --creator "researcher@example" \
  --encoding MSGPACK \
  --crypto SHA-256
```

Options:
- `--dir <path>`: Directory containing all model files (recommended)
- `--weights, -w <path>`: Model weights binary (required if not using --dir)
- `--data, -d <path>`: Dataset file CSV (required if not using --dir)
- `--fairness-threshold, -f <path>`: Fairness configuration JSON (required if not using --dir)
- `--name, -n <string>`: Display name (overrides model.json)
- `--description, -D <string>`: Model description (overrides model.json)
- `--creator, -C <string>`: Creator identifier (overrides model.json, optional)
- `--encoding, -e <MSGPACK|JSON>`: Dataset encoding (default MSGPACK)
- `--crypto, -c <SHA-256|BLAKE2b>`: Hash algorithm (default SHA-256)

**Note:** You must use either `--dir` OR all of `--weights`, `--data`, and `--fairness-threshold`. CLI flags for name/description/creator override values from `model.json` if present.

Returns: Transaction hash of the commitment registration.

---

### proof

Generate & submit a model bias proof (currently registers model + commitments; proof generation is WIP placeholder in `impl.ts`).

**Option 1: Using Directory Convention (Recommended)**
```bash
zkfair proof prove-model-bias \
  --dir ./examples/heart-disease \
```

**Option 2: Using Explicit Paths**
```bash
zkfair proof prove-model-bias \
  --weights weights.bin \
  --data dataset.csv \
  --fairness-threshold fairness_threshold.json \
  --name "Heart Disease Model" \
  --description "Fairness analysis for heart disease predictor" \
  --creator "researcher@example" \
  --encoding MSGPACK \
  --crypto SHA-256 \
  --out proof_salts.json
```

Options:
- `--dir <path>`: Directory containing all model files (recommended)
- `--weights, -w <path>`: Model weights (required if not using --dir)
- `--data, -d <path>`: Dataset file (required if not using --dir)
- `--fairness-threshold, -f <path>`: Fairness config JSON (required if not using --dir)
- `--attributes, -a <attr1,attr2,...>` (required): Protected attributes tested
- `--name, -n <string>`: Display name (overrides model.json)
- `--description, -D <string>`: Model description (overrides model.json)
- `--creator, -C <string>`: Creator identifier (overrides model.json, optional)
- `--encoding, -e <MSGPACK|JSON>` (optional, default MSGPACK)
- `--crypto, -c <SHA-256|BLAKE2b>` (optional, default SHA-256)
- `--out, -o <path>` (optional): Where to write salts metadata (if implemented)

**Note:** You must use either `--dir` OR all of `--weights`, `--data`, and `--fairness-threshold`.

Check proof status (by committed proof hash or recomputed weights hash):
```bash
zkfair proof status 0xproofhash...
zkfair proof status ./weights.bin
```
Positional resolution logic (see `getProofStatus`):
1. If first arg looks like a hex hash (`0x...`), it's treated as a proof hash.
2. Otherwise it's treated as a local weights file whose hash will be computed.

Returns: Proof status enum (REGISTERED | VERIFIED | FAILED | UNKNOWN).

---

### verify

Verify a proof locally (dev) or on-chain:
```bash
zkfair verify 0xproofhash... input1,input2,input3
zkfair verify --weights weights.bin "val1,val2,val3" --local
```
Options:
- `proof-hash` positional (optional if `--weights` used)
- `--weights, -w <path>`: Recompute hash from weights file instead of passing proof hash
- `public-inputs` positional (required): Comma list OR path to JSON file (current implementation splits on commas; JSON expansion TBD)
- `--local`: Verify proof locally instead of on-chain (DEV mode)

Output: Success / failure of on-chain (or local) verification.

---

## � Typical Workflow

```bash
## 📋 Typical Workflow

```bash
# 1. Train your model and generate required files
cd examples/adult-income
python main.py
# Generates: weights.bin, dataset.csv, fairness_threshold.json, model.json

# 2. Commit model (master salt auto-generated, cached in ~/.zkfair/)
cd ../..
zkfair commit --dir ./examples/adult-income

# 3. Run fairness proof
zkfair proof prove-model-bias \
  --dir ./examples/adult-income \

# 4. Inspect proof status
zkfair proof status ./examples/adult-income/weights.bin

# 5. Verify on-chain
zkfair verify 0xproofhash... input1,input2,input3

# 6. Explore models
zkfair model list
zkfair model get --weights ./examples/adult-income/weights.bin
```

---

## 🆘 Help
```bash
./zkfair --help
./zkfair model --help
./zkfair proof prove-model-bias --help
```
