import { secp256k1 } from "@noble/curves/secp256k1";
import { encodeTranscript } from "./codec";
import type {
	CoinFlip,
	Hex,
	MacBundle,
	ProviderKeys,
	QueryTranscript,
} from "./types";

function bytesToHex(bytes: Uint8Array): string {
	return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
	const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
	const bytes = new Uint8Array(clean.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

export class Provider {
	constructor(private keys: ProviderKeys) {}

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
		const keyBytes = this.hexToBytes(this.keys.macKey);
		const hasher = new Bun.CryptoHasher("sha256", keyBytes);
		hasher.update(msg);
		const macBytes = new Uint8Array(hasher.digest());
		return `0x${bytesToHex(macBytes)}` as Hex;
	}

	// Sign mac || hash(transcript)
	signBundle(t: QueryTranscript, mac: Hex): MacBundle {
		const hashT = Bun.sha(encodeTranscript(t)) as Uint8Array;
		const payload = new Uint8Array(this.hexToBytes(mac).length + hashT.length);
		payload.set(this.hexToBytes(mac), 0);
		payload.set(hashT, this.hexToBytes(mac).length);
		const payloadHash = Bun.sha(payload) as Uint8Array;
		const sig = secp256k1.sign(
			payloadHash,
			this.hexToBytes(this.keys.privateKey),
		);
		return {
			mac,
			providerSignature: `0x${bytesToHex(sig.toCompactRawBytes())}` as Hex,
		};
	}

	// Utilities

	private hexToBytes(hex: Hex): Uint8Array {
		return hexToBytes(hex);
	}
	private hashConcat(a: Hex, b: Hex): Hex {
		const bytes = new Uint8Array(
			this.hexToBytes(a).length + this.hexToBytes(b).length,
		);
		bytes.set(this.hexToBytes(a), 0);
		bytes.set(this.hexToBytes(b), this.hexToBytes(a).length);
		const hash = Bun.sha(bytes) as Uint8Array;
		return `0x${bytesToHex(hash)}` as Hex;
	}
}
