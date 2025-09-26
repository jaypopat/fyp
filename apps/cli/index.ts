import { run } from "@drizzle-team/brocli";
import { commit, model, proof, verify } from "./commands";

run([model, proof, commit, verify], {
	name: "zkfair",
	version: "0.1.0",
	help: `Available commands:
    model   Manage models
    proof   Manage proofs
    commit  Commit circuits / proofs
    verify  Verify proofs
  `,
});
