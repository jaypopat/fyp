import { secp256k1 } from "@noble/curves/secp256k1";
import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import type { Hex } from "viem";
import type {
	CoinFlip,
	MacBundle,
	ProviderKeys,
	QueryTranscript,
} from "./types";
import { encodeTranscript } from "./codec";

export class Provider {
	constructor(private keys: ProviderKeys) { }

	// Generate provider randomness and compute final coins
	performCoinFlip(clientCommit: Hex, clientRand: Hex): CoinFlip {
		const providerRand = bytesToHex(
			crypto.getRandomValues(new Uint8Array(32)) as Uint8Array,
		) as Hex;
		const coins = this.hashConcat(clientRand, providerRand);
		return {
			clientCommit,
			providerRand: `0x${providerRand}` as Hex,
			clientRand,
			coins,
		};
	}

	makeTranscript(
		args: Omit<QueryTranscript, "coins"> & { coins: Hex },
	): QueryTranscript {
		return { ...args };
	}

	// Compute HMAC over transcript
	computeMac(t: QueryTranscript): Hex {
		const msg = encodeTranscript(t);
		const macBytes = hmac(sha256, this.hexToBytes(this.keys.macKey), msg);
		return `0x${bytesToHex(macBytes)}` as Hex;
	}

	// Sign mac || hash(transcript)
	signBundle(t: QueryTranscript, mac: Hex): MacBundle {
		const hashT = sha256(encodeTranscript(t));
		const payload = new Uint8Array(this.hexToBytes(mac).length + hashT.length);
		payload.set(this.hexToBytes(mac), 0);
		payload.set(hashT, this.hexToBytes(mac).length);
		const sig = secp256k1.sign(
			sha256(payload),
			this.hexToBytes(this.keys.privateKey),
		);
		return {
			mac,
			providerSignature: `0x${bytesToHex(sig.toCompactRawBytes())}` as Hex,
		};
	}

	// Utilities

	private hexToBytes(hex: Hex): Uint8Array {
		return hex.startsWith("0x") ? hexToBytes(hex.slice(2)) : hexToBytes(hex);
	}
	private hashConcat(a: Hex, b: Hex): Hex {
		const bytes = new Uint8Array(
			this.hexToBytes(a).length + this.hexToBytes(b).length,
		);
		bytes.set(this.hexToBytes(a), 0);
		bytes.set(this.hexToBytes(b), this.hexToBytes(a).length);
		return `0x${bytesToHex(sha256(bytes))}` as Hex;
	}
}
