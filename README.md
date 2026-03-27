# zkFair

zkFair is a framework for generating and verifying **zero-knowledge proofs of ML model fairness**. Providers register models, commit query batches, and respond to fairness audits — all using ZK proofs on-chain. Users get cryptographic guarantees that deployed models satisfy demographic parity, without the provider ever revealing model weights or training data.

[Documentation](https://fyp.jaypopat.me/docs) | [Live Demo](https://app.fyp.jaypopat.me)

## Key Contributions

### 1. Zero-Knowledge Fairness Protocol
Two Noir ZK circuits enable privacy-preserving fairness verification:
- **Training Certification** — proves a model satisfies demographic parity on its training dataset, without revealing weights or data
- **Batch Auditing** — proves ongoing fairness on random samples from deployed inference batches, enabling continuous runtime monitoring

### 2. Economic Incentive Mechanism
A Solidity smart contract enforces honest participation through staking and slashing:
- Providers stake ETH to register models; dishonest behavior (missed audits, invalid proofs) results in stake forfeiture
- Auditors stake to challenge batches; valid challenges are rewarded from the provider's stake
- 24-hour response deadlines with automatic slashing for non-compliance

### 3. Client-Side Fraud Detection (Sentinel)
Users receive signed receipts for every inference query. The Sentinel system detects two classes of provider fraud:
- **Non-inclusion** — a query was made but never appeared in any committed batch
- **Fraudulent inclusion** — a query was batched with tampered data (different features or prediction)

Both dispute types are provable on-chain using the signed receipt as evidence.

### 4. Open-Source Modular Implementation
A production-ready TypeScript SDK and toolchain:
- **SDK** (`@zkfair/sdk`) — core library with contract interaction, proof generation, Poseidon hashing, Merkle trees, and provider/client utilities
- **ZK Circuits** (`@zkfair/zk-circuits`) — Noir circuits compiled to UltraHonk via `@aztec/bb.js`
- **Smart Contract** (`@zkfair/contracts`) — Solidity contract with model registry, batch commitments, audit lifecycle, and dispute resolution
- **Apps** — CLI for providers, React dashboard, inference server, and off-chain attestation service

## Repo Structure

```
apps/
  cli/           Command-line interface for providers
  web/           React dashboard (model registry, audit tracking)
  server/        Hono inference server (ONNX model, query logging, auto-batching)
  attestation/   Off-chain proof verification + signed attestations
  www/           Landing page + documentation site

packages/
  sdk/           TypeScript SDK shared across all apps
  contracts/     Solidity smart contract (Foundry)
  zk-circuits/   Noir ZK circuits (training + fairness audit)
```

## Getting Started

```bash
# Install dependencies
bun install

# Run all apps in dev (starts local anvil chain + all services)
bun run dev

# Run a single app
turbo run dev --filter=web
turbo run dev --filter=server

# Build everything
turbo run build

# Run contract tests
cd packages/contracts && bun run test

# Run SDK tests
cd packages/sdk && bun test

# Compile ZK circuits
cd packages/zk-circuits && bun run compile
```
