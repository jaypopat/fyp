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

Create on-chain commitments for a model's weights + dataset:
```bash
zkfair commit \
  --weights weights.bin \
  --data dataset.csv \
  --fairness-threshold fairness.json \
  --name "FairNet" \
  --description "Binary classifier" \
  --creator "researcher@example" \ # optional
  --encoding MSGPACK \            # optional (default MSGPACK)
  --crypto SHA-256                # optional (default SHA-256)
```
Options (see `cli-args.ts`):
- `--weights, -w <path>` (required): Model weights binary
- `--data, -d <path>` (required): Dataset file (CSV/JSON)
- `--fairness-threshold, -f <path>` (required): Path to fairness configuration JSON file
- `--name, -n <string>` (required): Display name
- `--description, -D <string>` (required)
- `--creator, -C <string>` (optional): Creator / author identifier stored in metadata
- `--encoding, -e <MSGPACK|JSON>`: Dataset encoding (default MSGPACK)
- `--crypto, -c <SHA-256|BLAKE2b>`: Hash algo (default SHA-256)

Returns: Transaction hash of the commitment registration.

---

### proof

Generate & submit a model bias proof (currently registers model + commitments; proof generation is WIP placeholder in `impl.ts`):
```bash
zkfair proof prove-model-bias \
  --weights weights.bin \
  --data test.csv \
  --fairness-threshold fairness.json \
  --attributes gender,age \
  --name "FairNet" \
  --description "Bias analysis run" \
  --creator "researcher@example" \ # optional
  --encoding MSGPACK \            # optional (default MSGPACK)
  --crypto SHA-256 \              # optional (default SHA-256)
  --out proof_salts.json
```
Options:
- `--weights, -w <path>` (required)
- `--data, -d <path>` (required)
- `--fairness-threshold, -f <path>` (required): Path to fairness configuration JSON file
- `--attributes, -a <attr1,attr2,...>` (required): Protected attributes tested
- `--name, -n <string>` (required)
- `--description, -D <string>` (required)
- `--creator, -C <string>` (optional)
- `--encoding, -e <MSGPACK|JSON>` (optional, default MSGPACK)
- `--crypto, -c <SHA-256|BLAKE2b>` (optional, default SHA-256)
- `--out, -o <path>` (optional): Where to write salts metadata (if implemented)

Check proof status (by committed proof hash or recomputed weights hash):
```bash
zkfair proof status 0xproofhash...
zkfair proof status ./weights.bin
```
Positional resolution logic (see `getProofStatus`):
1. If first arg looks like a hex hash (`0x...`), it’s treated as a proof hash.
2. Otherwise it’s treated as a local weights file whose hash will be computed.

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
# 1. Prepare model artifacts and fairness config
python train.py
# This should generate weights.bin and fairness.json

# 2. Commit model + dataset
zkfair commit \
  --weights weights.bin \
  --data train.csv \
  --fairness-threshold fairness.json \
  --name "FairNet" \
  --description "Initial registration"

# 3. Run fairness proof (register + placeholder future proof)
zkfair proof prove-model-bias \
  --weights weights.bin \
  --data test.csv \
  --fairness-threshold fairness.json \
  --attributes gender,age \
  --name "FairNet" \
  --description "Bias evaluation"

# 4. Inspect proof status
zkfair proof status weights.bin

# 5. Verify (on-chain)
zkfair verify 0xproofhash... input1,input2,input3

# 6. Explore models
zkfair model list
zkfair model get --weights weights.bin
```
```

---

## 🆘 Help
```bash
./zkfair --help
./zkfair model --help
./zkfair proof prove-model-bias --help
```