# zkFair Turborepo

zkFair is a framework and toolchain for generating and verifying **zero-knowledge proofs of ML model fairness**.
This repository is a [Turborepo](https://turbo.build/) with multiple apps and packages.

---

## 📂 Structure

```

apps/
  cli/       → Command-line interface
  docs/      → Documentation site
  landing/   → landing page
  web/       → Web dashboard (Registry)

packages/
  contracts/   → Solidity contracts for verifying proofs and storing model metadata
  sdk/         → TypeScript SDK for web and cli to interact with contracts
  zk-circuits/ → Noir circuits for ZK logic

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
turbo run dev --filter=docs
turbo run dev --filter=landing
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
