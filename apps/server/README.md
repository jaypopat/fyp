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
