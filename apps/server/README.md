# Provider Mock Inference Server

A mock ML inference server built with [Hono](https://hono.dev) that demonstrates how ML service providers would expose prediction endpoints in the OATH fairness verification system.

## Overview

This server simulates a **certified ML service provider** that:
- Exposes a `/predict` endpoint for model inference
- Authenticates predictions using IT-MAC (Information-Theoretic Message Authentication Codes)
	- Stores minimal per-query logs (batches/Merkle come later)
	- Provides IT-MAC authenticated predictions for later auditing


## API

POST /predict
- Body:
	- modelId: string | number
	- input: number[]
	- clientCommit?: Hex // optional: commitment H(clientRand)
	- clientRand?: Hex   // optional: client random for coin flip
	- queryId?: string   // optional: unique id; server will generate if missing

- Response:
	- modelId: string | number
	- prediction: number
	- timestamp: number
	- inputHash: Hex // sha256(JSON.stringify(input))
	- queryId: string
	- itmac?:
		- providerRand: Hex
		- coins: Hex
		- transcript: { queryId, modelId, inputHash, prediction, timestamp, coins }
		- bundle: { mac, providerSignature }
		- providerPublicKey: Hex

GET /health
- Returns server status and loaded model ids.

Notes
- Minimal records are persisted to `apps/server/db.json` for demo purposes.
- For production, consider a real database and store hashes/commitments instead of raw inputs if privacy is required.