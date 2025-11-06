import { run } from "@drizzle-team/brocli";
import { client, commit, model, proof, verify } from "./commands";

run([model, proof, commit, verify, client], {
	name: "zkfair",
	version: "0.1.0",
	help: `Available commands:
    model    List & inspect registered models
    proof    Generate & query proofs (prove-model-bias, status)
    commit   Commit model weights & dataset (on-chain)
    verify   Verify a proof locally or on-chain
    client   Client operations - run inference, push query commitments
  `,
});
