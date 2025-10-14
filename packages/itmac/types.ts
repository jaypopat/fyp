import type { Hex } from "viem";

export type Bytes = Uint8Array;

export type CoinFlip = {
	clientCommit: Hex; // H(clientRand)
	providerRand: Hex; // provider random reveal
	clientRand: Hex; // client random reveal
	coins: Hex; // H(clientRand || providerRand)
};

export type QueryTranscript = {
	queryId: string;
	modelId: number;
	inputHash: Hex; // H(encode(input))
	prediction: number;
	timestamp: number;
	coins: Hex; // from coin flip
};

export type MacBundle = {
	mac: Hex; // HMAC_k(serialize(transcript))
	providerSignature: Hex; // sig(sk_provider, mac || transcriptHash)
};

export type ProviderKeys = {
	privateKey: Hex; // secp256k1 private key
	publicKey: Hex; // secp256k1 public key (uncompressed or compressed)
	macKey: Hex; // symmetric key for HMAC
};

export type ClientVerifyResult = {
	valid: boolean;
	reason?: string;
};
