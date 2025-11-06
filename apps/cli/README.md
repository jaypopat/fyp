# zkfair CLI

Command-line interface for the ZKFair protocol - register models, query with IT-MAC cryptographic verification, and manage fairness proofs.

---

## ✨ Features

- **Interactive & Scriptable** - Beautiful prompts for humans, full arg support for automation
- **Model Management** - Register, list, and inspect models on-chain
- **Client Queries** - Query models with IT-MAC protocol for cryptographically verified inference
- **Fairness Proofs** - Generate and verify fairness certification proofs (WIP)
- **Flexible Input** - Use interactive prompts OR command-line args

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

```env
RPC_URL=<your_json_rpc_endpoint>
PRIVATE_KEY=<hex_private_key>
CONTRACT_ADDRESS=<deployed_zkfair_contract>
```

All on-chain actions (commit, register) require these values. Client queries work with any provider URL.

Load automatically via Bun (it reads `.env` on start) or export them in your shell.

---

## 🧭 Command Structure

```
zkfair
├── model            Model registry operations
│   ├── list        List all registered models
│   └── get         Get model details (interactive or by hash/file)
├── client           Client operations
│   └── query       Query model with IT-MAC verification (interactive)
├── proof            Proof operations
│   ├── prove-model-bias    Generate fairness proof (WIP)
│   └── status              Check proof status (interactive or by hash)
├── commit           Commit model to blockchain (with confirmation)
└── verify           Verify proof locally or on-chain (interactive)
```

---

## 🎯 Interactive Features

**NEW!** Most commands now support interactive mode - just omit arguments and you'll get beautiful prompts:

### Interactive Examples

```bash
# Interactive model selection
./zkfair model get
? Select a model to view details: (Use arrow keys)
❯ Adult Income Model (Certified)
  Heart Disease Predictor (Pending)
  Student Performance Model (Certified)

# Interactive query with IT-MAC verification
./zkfair client query
? Select a model to query:
❯ Adult Income Model (Certified)
  Author: 0xABCD1234... | Hash: 0x1234...
? Enter input values (comma-separated numbers): 0.5,1.2,0.3
✓ Prediction: 0.87 (cryptographically verified)

# Interactive auditing
./zkfair audit verify-membership
? Select a batch to verify:
❯ Batch 0-99 (150 records)
  Root: 0x1234... | Created: 11/5/2025, 3:45 PM
? Enter the query ID to verify: abc123-def456
✓ Membership verification: VALID

# Commitment with confirmation
./zkfair commit --dir ./examples/adult-income
   Model Name: Adult Income Predictor
   Encoding: MSGPACK
   Hash Algorithm: SHA-256
? This will submit a blockchain transaction (gas fees apply). Continue? (Y/n)
```

### Scriptable Mode

All commands still accept full arguments for CI/CD and automation:

```bash
./zkfair model get 0x1234...
./zkfair client query 0x1234... "0.5,1.2,0.3"
```

---

---

## 🛠 Commands & Options

### 📋 model

#### `model list`

List all registered models with their status, authors, and registration times.

```bash
./zkfair model list
```

**Output Example:**
```
📊 Found 3 registered models:
==========================================

1. Adult Income Model
   Author: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
   Status: Certified
   Hash: 0x1234abcd...
   Description: Predicts income brackets based on demographic data
   Registered: 11/5/2025, 2:30:00 PM

2. Heart Disease Predictor
   ...
```

---

#### `model get`

Get detailed information about a specific model.

**Interactive Mode:**
```bash
./zkfair model get
```
Prompts you to select from available models.

**Direct Mode:**
```bash
# By hash
./zkfair model get 0xabc123...

# By weights file (computes hash)
./zkfair model get --weights ./weights.bin
```

**Options:**
- `model-hash` (positional): Model weights hash (0x...)
- `--weights, -w <path>`: Path to weights file (alternative to hash)

**Output:** Full model details including name, author, status, hashes, timestamps, and proof information.

---

### 💬 client

#### `client query`

Query a model with IT-MAC cryptographic verification protocol.

**Interactive Mode:**
```bash
./zkfair client query
```
Prompts for model selection and input values.

**Direct Mode:**
```bash
./zkfair client query 0x1234... "0.5,1.2,0.3,0.8"
./zkfair client query 0x1234... "0.5,1.2,0.3" --mac-key 0xabcd... --query-id custom-id
```

**Options:**
- `model-id` (positional): Model hash to query
- `input` (positional): Comma-separated input values
- `--provider-url, -u <url>`: Provider server URL (default: http://localhost:5000)
- `--mac-key, -m <hex>`: Optional MAC key for HMAC verification
- `--query-id, -q <id>`: Optional query ID (default: random UUID)

**Features:**
- ✅ Cryptographic commitment generation
- ✅ IT-MAC protocol verification (signature + optional HMAC)
- ✅ Tamper-proof predictions
- ✅ Query audit trail

**Output Example:**
```
📊 Prediction Result: 0.8734

✅ IT-MAC Verification:
✅ IT-MAC verification PASSED!
   The prediction is cryptographically verified and tamper-proof.
```

---

###  proof

#### `proof prove-model-bias`

Generate and submit a fairness proof for a model (WIP - currently registers model).

```bash
./zkfair proof prove-model-bias --dir ./examples/adult-income
```

**Options:**
- `--dir <path>`: Directory containing model files (weights.bin, dataset.csv, fairness_threshold.json, model.json)
- `--weights, -w <path>`: Model weights (required if not using --dir)
- `--data, -d <path>`: Dataset file (required if not using --dir)
- `--fairness-threshold, -f <path>`: Fairness config (required if not using --dir)
- `--name, -n <string>`: Model name (overrides model.json)
- `--description, -desc <string>`: Model description
- `--creator, -C <string>`: Creator identifier
- `--encoding, -e <MSGPACK|JSON>`: Dataset encoding (default: MSGPACK)
- `--crypto, -c <SHA-256|BLAKE2b>`: Hash algorithm (default: SHA-256)

---

#### `proof status`

Check the certification status of a model's proof.

**Interactive Mode:**
```bash
./zkfair proof status
```
Prompts to select from available models.

**Direct Mode:**
```bash
# By proof hash
./zkfair proof status 0xproofhash...

# By weights file
./zkfair proof status ./weights.bin
```

**Options:**
- `proof-hash` (positional): Proof hash to check
- `weights` (positional): Path to weights file (alternative)

**Output:**
```
📊 Proof Status Results:
   Weights Hash: 0x1234...
   Status: VERIFIED
```

---

### 📝 commit

Commit a model's weights and dataset to the blockchain.

**⚠️ Important:** This command requires confirmation before submitting the transaction (gas fees apply).

```bash
# Interactive confirmation
./zkfair commit --dir ./examples/adult-income

# Full options
./zkfair commit \
  --weights weights.bin \
  --data dataset.csv \
  --fairness-threshold fairness_threshold.json \
  --name "Adult Income Predictor" \
  --description "Binary classifier for income prediction" \
  --creator "researcher@example" \
  --encoding MSGPACK \
  --crypto SHA-256
```

**Directory Structure Expected (when using --dir):**
```
./examples/adult-income/
├── weights.bin                  # Model weights (required)
├── dataset.csv                  # Training dataset (required)
├── fairness_threshold.json      # Fairness config (required)
└── model.json                   # Model metadata (optional)
```

**Options:**
- `--dir <path>`: Directory containing all model files (recommended)
- `--weights, -w <path>`: Model weights binary (required if not using --dir)
- `--data, -d <path>`: Dataset file (required if not using --dir)
- `--fairness-threshold, -f <path>`: Fairness configuration (required if not using --dir)
- `--name, -n <string>`: Display name (overrides model.json)
- `--description, -desc <string>`: Model description (overrides model.json)
- `--creator, -C <string>`: Creator identifier (optional)
- `--encoding, -e <MSGPACK|JSON>`: Dataset encoding (default: MSGPACK)
- `--crypto, -c <SHA-256|BLAKE2b>`: Hash algorithm (default: SHA-256)

**Confirmation Prompt:**
```
   Model Name: Adult Income Predictor
   Description: Predicts income brackets...
   Encoding: MSGPACK
   Hash Algorithm: SHA-256

? This will submit a blockchain transaction (gas fees apply). Continue? (Y/n)
```

**Output:** Transaction hash of the commitment registration.

---

### ✅ verify

Verify a fairness proof locally or on-chain.

**Interactive Mode:**
```bash
./zkfair verify
```
Prompts to select from models with proofs, then prompts for public inputs.

**Direct Mode:**
```bash
# By proof hash
./zkfair verify 0xproofhash... "input1,input2,input3"

# By weights file
./zkfair verify --weights weights.bin "val1,val2,val3" --local
```

**Options:**
- `proof-hash` (positional): Proof hash to verify
- `--weights, -w <path>`: Recompute hash from weights file
- `public-inputs` (positional): Comma-separated public inputs
- `--local`: Verify proof locally instead of on-chain (DEV mode)

**Smart Filtering:** Interactive mode only shows models that have certification proofs attached.

**Output:**
```
✅ Proof Verification Successful!
   The submitted proof is valid and the model meets fairness constraints.
```

---

## � Typical Workflow

```bash
---

## 📋 Typical Workflow

### End-to-End Example

```bash
# 1. Train your model and generate required files
cd examples/adult-income
python main.py
# Generates: weights.bin, dataset.csv, fairness_threshold.json, model.json

# 2. Commit model to blockchain (interactive confirmation)
cd ../..
./zkfair commit --dir ./examples/adult-income
# ✅ Model committed! Transaction: 0xabc123...

# 3. Generate fairness proof (WIP - currently registers model)
./zkfair proof prove-model-bias --dir ./examples/adult-income

# 4. Check proof status (interactive)
./zkfair proof status
# Select model → Shows VERIFIED/REGISTERED/FAILED

# 5. Verify proof on-chain (interactive)
./zkfair verify
# Select model with proof → Enter public inputs → ✅ PASSED

# 6. Query model with IT-MAC verification (interactive)
./zkfair client query
# Select model → Enter input values → Get verified prediction

# 7. Server automatically handles audit challenges
# When auditors challenge batches on-chain, the server:
# - Listens for AuditRequested events
# - Builds Merkle trees from query records
# - Generates fairness ZK proofs
# - Submits proofs on-chain
```

---

## 🔄 OATH Protocol Architecture

The ZKFair CLI integrates with a server-side audit system:

1. **Client Queries** (`./zkfair client query`)
   - Client generates commitment and randomness
   - Server responds with IT-MAC-signed prediction
   - Client verifies cryptographic proof

2. **Batch Commitment** (Server)
   - Server groups queries into batches
   - Computes Merkle root
   - Commits batch on-chain via `commitBatch()`

3. **Audit Challenges** (On-chain)
   - Auditors can request audit of any batch
   - Smart contract emits `AuditRequested` event

4. **Automatic Response** (Server)
   - Server listens for `AuditRequested` events
   - Fetches records from local database
   - Generates fairness ZK proof
   - Submits proof on-chain via `submitAuditProof()`

5. **Proof Verification** (Smart Contract)
   - Contract verifies ZK proof
   - Slashes provider if proof fails
   - Pays auditor bounty if proof succeeds

**Note:** The CLI user doesn't need to interact with auditing - it happens automatically when challenged on-chain.

---


## 🆘 Help Commands

```bash
# General help
./zkfair --help

# Command group help
./zkfair model --help
./zkfair proof --help
./zkfair client --help

# Specific command help
./zkfair proof prove-model-bias --help
./zkfair client query --help
./zkfair commit --help
```
