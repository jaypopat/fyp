#!/usr/bin/env bun
import { run } from "@drizzle-team/brocli";
import { commit, model, proof } from "./commands";

run([model, proof, commit], {
	name: "zkfair",
	version: "0.1.0",
	help: `Available commands:
    model    List & inspect registered models
    proof    Generate & query proofs (prove-model-bias, status)
    commit   Commit model weights & dataset (on-chain)`,
});
