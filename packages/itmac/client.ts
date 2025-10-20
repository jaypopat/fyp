import { secp256k1 } from "@noble/curves/secp256k1";
import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { encodeTranscript } from "./codec";
import type {
	ClientVerifyResult,
	Hex,
	MacBundle,
	QueryTranscript,
} from "./types";

export class Client {
	constructor(
		private providerPubKey: Hex,
		private macKey?: Hex,
	) {}

	// Static helper: client randomness & commitment; does not require provider keys
	static generateCommitment(): { clientRand: Hex; clientCommit: Hex } {
		const rand = crypto.getRandomValues(new Uint8Array(32)) as Uint8Array;
		const clientRand = `0x${bytesToHex(rand)}` as Hex;
		const commit = `0x${bytesToHex(sha256(rand))}` as Hex;
		return { clientRand, clientCommit: commit };
	}

	// Client generates randomness and commitment
	generateCommitment(): { clientRand: Hex; clientCommit: Hex } {
		return Client.generateCommitment();
	}

	// Derive coins
	deriveCoins(clientRand: Hex, providerRand: Hex): Hex {
		const a = this.hexToBytes(clientRand);
		const b = this.hexToBytes(providerRand);
		const bytes = new Uint8Array(a.length + b.length);
		bytes.set(a, 0);
		bytes.set(b, a.length);
		return `0x${bytesToHex(sha256(bytes))}` as Hex;
	}

	// Verify provider bundle
	// - If macKey is provided, verify HMAC + signature
	// - If macKey is not provided, verify signature only
	verifyBundle(
		t: QueryTranscript,
		bundle: MacBundle,
		opts?: { verifyMac?: boolean },
	): ClientVerifyResult {
		const shouldVerifyMac = Boolean(this.macKey) && (opts?.verifyMac ?? true);
		if (shouldVerifyMac) {
			const macOk = this.verifyMac(t, bundle.mac);
			if (!macOk) return { valid: false, reason: "Invalid MAC" };
		}

		const hashT = sha256(encodeTranscript(t));
		const payload = new Uint8Array(
			this.hexToBytes(bundle.mac).length + hashT.length,
		);
		payload.set(this.hexToBytes(bundle.mac), 0);
		payload.set(hashT, this.hexToBytes(bundle.mac).length);
		try {
			const sigBytes = this.hexToBytes(bundle.providerSignature);
			const ok = secp256k1.verify(
				sigBytes,
				sha256(payload),
				this.hexToBytes(this.providerPubKey),
			);
			return { valid: ok, reason: ok ? undefined : "Invalid signature" };
		} catch (e) {
			return { valid: false, reason: (e as Error).message };
		}
	}

	private verifyMac(t: QueryTranscript, mac: Hex): boolean {
		if (!this.macKey) return false;
		const expected = hmac(
			sha256,
			this.hexToBytes(this.macKey),
			encodeTranscript(t),
		);
		return `0x${bytesToHex(expected)}` === mac;
	}
	private hexToBytes(hex: Hex): Uint8Array {
		return hex.startsWith("0x") ? hexToBytes(hex.slice(2)) : hexToBytes(hex);
	}
}
