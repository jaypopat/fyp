# zkFair Turborepo

zkFair is a framework and toolchain for generating and verifying **zero-knowledge proofs of ML model fairness**.
This repository is a [Turborepo](https://turbo.build/) with multiple apps and packages.

---

## What does this solve
This platform provides a privacy-preserving way for model providers to prove their AI models are fair, while giving users confidence to interact with verifiably unbiased systems. We decentralize trust by making the entire process permissionless: anyone can register as a provider, challenge models through audits (zk-powered!).

## How it works

#### For Users
- Browse verified models in the web UI registry
- Challenge any model with an audit request
- Query models for inference with confidence they're unbiased

#### For Providers

- Register your model using the CLI (apps/cli) and generate certification proofs
- Upload batches of query commitments at regular intervals
- Respond to audits within the deadline or lose your stake

#### For Auditors

- Select any model batch to audit
- If providers fail to respond or provide invalid proofs, claim their entire stake as reward


## Roadmap
- Monetization layer - Enable providers to charge for inference via x402 protocol integration
- Simplified onboarding - Abstract server logic with plug-and-play DB adapters, automatic batching, and schema helpers


## 📂 Repo Structure

```

apps/
  cli/       → Command-line interface
  www/       → landing page + docs
  web/       → Web dashboard (Registry)
  server/    → Mock provider server (plug and play using sdk components)

packages/
  contracts/   → Solidity contracts for verifying proofs and storing model metadata
  sdk/         → TypeScript SDK for web/server and cli to interact with contracts
  zk-circuits/ → Noir circuits for ZK logic (registration and ongoing audit circuits)
  itmac/       → ITMAC Protocol functions used by the provider/auditor/client for any interactions

````

---

## 🚀 Getting Started

### Install dependencies
```bash
bun install
````

### Run all apps in dev

```bash
bun run dev
# or
turbo run dev
```

### Run a single app

```bash
turbo run dev --filter=cli
turbo run dev --filter=web
turbo run dev --filter=www
```

### Build everything

```bash
turbo run build
```

### Build a single app/package

```bash
turbo run build --filter=sdk
turbo run build --filter=zk-circuits
```
