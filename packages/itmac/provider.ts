import { secp256k1 } from "@noble/curves/secp256k1";
import { encodeTranscript } from "./codec";
import type {
	CoinFlip,
	Hex,
	MacBundle,
	ProviderKeys,
	QueryTranscript,
} from "./types";
import { bytesToHex, hexToBytes } from "./utils";

export class Provider {
	constructor(private keys: ProviderKeys) {}

	// verify client's commitment matches their revealed randomness
	static verifyClientCommitment(clientCommit: Hex, clientRand: Hex): boolean {
		try {
			const randBytes = hexToBytes(clientRand);
			const commitBytes = Bun.sha(randBytes) as Uint8Array;
			const expectedCommit = `0x${bytesToHex(commitBytes)}` as Hex;
			return expectedCommit.toLowerCase() === clientCommit.toLowerCase();
		} catch {
			return false;
		}
	}

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
		const keyBytes = hexToBytes(this.keys.macKey);
		const hasher = new Bun.CryptoHasher("sha256", keyBytes);
		hasher.update(msg);
		const macBytes = new Uint8Array(hasher.digest());
		return `0x${bytesToHex(macBytes)}` as Hex;
	}

	// Sign mac || hash(transcript)
	signBundle(t: QueryTranscript, mac: Hex): MacBundle {
		const hashT = Bun.sha(encodeTranscript(t)) as Uint8Array;
		const payload = new Uint8Array(hexToBytes(mac).length + hashT.length);
		payload.set(hexToBytes(mac), 0);
		payload.set(hashT, hexToBytes(mac).length);
		const payloadHash = Bun.sha(payload) as Uint8Array;
		const sig = secp256k1.sign(payloadHash, hexToBytes(this.keys.privateKey));
		return {
			mac,
			providerSignature: `0x${bytesToHex(sig.toCompactRawBytes())}` as Hex,
		};
	}

	/**
	 * High-level convenience method: Create authenticated transcript with IT-MAC
	 * Performs coin flip, builds transcript, computes MAC, and signs bundle
	 *
	 * @param clientCommit - Client's commitment H(clientRand)
	 * @param clientRand - Client's revealed randomness
	 * @param data - Query data (queryId, modelId, inputHash, prediction, timestamp)
	 * @returns Complete ITMAC bundle with coin flip, transcript, and signature
	 * @throws Error if client commitment verification fails
	 */
	createAuthenticatedTranscript(args: {
		clientCommit: Hex;
		clientRand: Hex;
		queryId: string;
		modelId: number;
		inputHash: Hex;
		prediction: number;
		timestamp: number;
	}): {
		flip: CoinFlip;
		transcript: QueryTranscript;
		bundle: MacBundle;
	} {
		// Verify client commitment
		if (!Provider.verifyClientCommitment(args.clientCommit, args.clientRand)) {
			throw new Error(
				"Invalid client commitment: H(clientRand) ≠ clientCommit",
			);
		}

		// Perform coin flip
		const flip = this.performCoinFlip(args.clientCommit, args.clientRand);

		// Build transcript
		const transcript = this.makeTranscript({
			queryId: args.queryId,
			modelId: args.modelId,
			inputHash: args.inputHash,
			prediction: args.prediction,
			timestamp: args.timestamp,
			coins: flip.coins,
		});

		// Compute MAC and sign
		const mac = this.computeMac(transcript);
		const bundle = this.signBundle(transcript, mac);

		return { flip, transcript, bundle };
	}

	// Utilities

	private hashConcat(a: Hex, b: Hex): Hex {
		const bytes = new Uint8Array(hexToBytes(a).length + hexToBytes(b).length);
		bytes.set(hexToBytes(a), 0);
		bytes.set(hexToBytes(b), hexToBytes(a).length);
		const hash = Bun.sha(bytes) as Uint8Array;
		return `0x${bytesToHex(hash)}` as Hex;
	}
}
