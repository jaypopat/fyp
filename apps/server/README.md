# Provider ML Inference Server

A production-ready ML inference server built with [Hono](https://hono.dev) that demonstrates how ML service providers expose prediction endpoints with fairness verification capabilities using the OATH protocol.

## Overview

This server implements a **certified ML service provider** that:
- Exposes a `/predict` endpoint for model inference using ONNX models
- Authenticates predictions using IT-MAC (Information-Theoretic Message Authentication Codes)
- Stores per-query logs for audit trail (in `db.json`)
- **Automatically responds to on-chain audit requests** via contract event listeners
- Provides cryptographically authenticated predictions for later auditing

## Features

- 🤖 **ONNX Model Serving**: Load and serve multiple ONNX models from `examples/` directory
- 🔐 **IT-MAC Authentication**: Cryptographic proof for each prediction
- 📊 **Query Logging**: Minimal storage for audit trail
- ⛓️ **Smart Contract Integration**: Watch for audit events and respond automatically
- 🔄 **Event-Driven**: Listens to blockchain events for audit requests

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

**Note**: If `CONTRACT_ADDRESS` and `PRIVATE_KEY` are set, the server will automatically:
- Watch for `ModelVerified` events and log them
- Watch for `AuditRequested` events and respond with fairness proofs (when implemented)

## API

### POST /predict
Perform inference on a model with optional IT-MAC authentication.

**Request:**
```json
{
  "modelId": "adult-income",
  "input": [39, 7, 77516, 9, 13, 4, 1, 1, 4, 1, 2174, 0, 40, 39],
  "clientCommit": "0x...",  // optional: H(clientRand)
  "clientRand": "0x...",    // optional: client random for coin flip
  "queryId": "uuid"         // optional: will be generated if not provided
}
```

**Response:**
```json
{
  "modelId": "adult-income",
  "prediction": 0,
  "timestamp": 1729000000000,
  "inputHash": "0x...",
  "queryId": "uuid",
  "itmac": {
    "providerRand": "0x...",
    "coins": "0x...",
    "transcript": {...},
    "bundle": {
      "mac": "0x...",
      "providerSignature": "0x..."
    },
    "providerPublicKey": "0x..."
  }
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "loadedModels": ["adult-income"],
  "timestamp": 1729000000000
}
```

### GET /models
List all loaded models.

**Response:**
```json
{
  "models": [
    { "modelId": "adult-income", "loaded": true }
  ]
}
```

## Architecture

### Event-Driven Audit Response

When deployed with contract integration, the server automatically:

1. **Listens** for `AuditRequested` events from the smart contract
2. **Retrieves** relevant queries from `db.json` for the requested time range
3. **Generates** a ZK proof of fairness on the query batch
4. **Submits** the proof on-chain automatically

```
Smart Contract → AuditRequested event → Server catches event
                                      → Fetches queries from db.json
                                      → Generates fairness proof
                                      → Submits proof on-chain
```

## Development

```bash
# Install dependencies
bun install

# Start server
bun run dev

# Test inference
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"modelId": "adult-income", "input": [39,7,77516,9,13,4,1,1,4,1,2174,0,40,39]}'
```

## Production

See [DEPLOY.md](./DEPLOY.md) for deployment instructions (Railway, Fly.io, Docker, etc.)

## Storage

- **Query logs**: Stored in `db.json` (file-based for demo)

## Notes

- Models are loaded from `../../examples/*/model.onnx` on startup
- IT-MAC keys can be generated using `@zkfair/itmac` package
- Event listeners require `CONTRACT_ADDRESS` and `PRIVATE_KEY` to be set
- Audit proof generation is currently a TODO (placeholder in event handler)