# Provider Mock Inference Server

A mock ML inference server built with [Hono](https://hono.dev) that demonstrates how ML service providers would expose prediction endpoints in the OATH fairness verification system.

## Overview

This server simulates a **certified ML service provider** that:
- Exposes a `/predict` endpoint for model inference
- Authenticates predictions using IT-MAC (Information-Theoretic Message Authentication Codes)
- Batches query commitments to the blockchain via Merkle trees
- Provides cryptographic proofs of fair model serving

**Note:** This is a **mock server for testing and demonstration**. In production, providers would:
- Load real trained ML models (via ONNX or Python bridge)
- Implement full IT-MAC key management
- Connect to actual blockchain networks
- Handle production-scale traffic