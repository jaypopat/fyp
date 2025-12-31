# Provider ML Inference Server

A production-ready ML inference server built with [Hono](https://hono.dev) that demonstrates how ML service providers expose prediction endpoints with fairness verification capabilities using the OATH protocol.

## Overview

This server implements a **certified ML service provider** that:
- Exposes a `/predict` endpoint for model inference using ONNX models
- Authenticates predictions using IT-MAC (Information-Theoretic Message Authentication Codes)
- Stores per-query logs in db
- **Automatically responds to on-chain audit requests** via contract event listeners
- Provides cryptographically authenticated predictions for later auditing

## Environment Variables

### Required (for inference)
```bash
PUBLIC_KEY=0x...      # IT-MAC provider public key
MAC_KEY=0x...         # IT-MAC symmetric key
PRIVATE_KEY=0x...     # IT-MAC provider private key
```

### Optional (for contract event listening)
```bash
CONTRACT_ADDRESS=0x...              # ZKFair contract address
RPC_URL=http://localhost:8545       # Ethereum RPC endpoint
PORT=5000                           # Server port (default: 5000)
```

## API

### POST /predict
Perform inference on a model with optional IT-MAC authentication.

## Demo Scripts

The server includes demonstration scripts that simulate **malicious provider behavior**:

### 1. Wrong Prediction Attack (Fraudulent Inclusion)
```bash
bun run demo:wrong-prediction
```

**What it does:**
- Provider commits **wrong predictions** to blockchain
- User receives correct prediction but blockchain has different value
- Creates valid Merkle tree but with tampered data

**Attack**: Provider returns biased/wrong predictions while claiming they came from a fair model.

**Detection** (in web app): 
- User's sentinel computes leaf hash with their **correct** local receipt
- Merkle proof verification **fails** against on-chain root
- Status: `FRAUD_INVALID_PROOF`

**Defense**: User calls `requestFraudsProofDispute(batchId)` → Provider must submit ZK proof → Proof fails (model can't produce that output) → Provider slashed.

---

### 2. Missing Queries Attack (Non-Inclusion)
```bash
bun run demo:missing-queries
```

Demonstrates a provider selectively omitting queries from batch commitments to hide evidence of unfair predictions.

**Attack**: Provider excludes queries that reveal bias from the merkle tree.

**Defense**: User has signed receipt → Disputes missing query → Contract verifies query should be in batch → Provider slashed.

These scripts illustrate the two main user dispute mechanisms:
1. **`requestAudit(batchId)`** - Challenge batch quality, force ZK proof verification
2. **`disputeQuery(modelId, seqNum, receipt)`** - Prove provider omitted a query from batch

## API
