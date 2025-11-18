import { SDK } from "@zkfair/sdk";
import type { Hex } from "./types";

export const sdk = new SDK({
	contractAddress: process.env.CONTRACT_ADDRESS as Hex,
	privateKey: process.env.PRIVATE_KEY as Hex,
	rpcUrl: process.env.RPC_URL || "http://localhost:8545",
	attestationServiceUrl:
		process.env.ATTESTATION_SERVICE_URL || "http://localhost:3000",
});
