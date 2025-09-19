#!/usr/bin/env bun

import { run } from "@drizzle-team/brocli";
import { model, proof, commit } from "./commands";

run([model, proof, commit], {
  name: "zkfair",
  version: "0.1.0",
  help: `Available commands:
    model   Manage models
    proof   Manage proofs
    commit  Commit circuits / proofs
  `,
});
