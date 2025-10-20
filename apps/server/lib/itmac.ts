import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { Provider } from "@zkfair/itmac";

type Hex = `0x${string}`;

export function verifyClientCommitment(
	clientCommit?: Hex,
	clientRand?: Hex,
): boolean {
	if (!clientCommit || !clientRand) return false;
	// clientCommit should equal H(clientRand)
	const raw = clientRand.startsWith("0x") ? clientRand.slice(2) : clientRand;
	const bytes = new Uint8Array(raw.length / 2);
	for (let i = 0; i < bytes.length; i++)
		bytes[i] = Number.parseInt(raw.slice(i * 2, i * 2 + 2), 16);
	const digest = `0x${bytesToHex(sha256(bytes))}` as Hex;
	return digest.toLowerCase() === clientCommit.toLowerCase();
}

export function makeItmacBundle(args: {
	provider: Provider;
	clientCommit: Hex;
	clientRand: Hex;
	transcript: {
		queryId: string;
		modelId: number;
		inputHash: Hex;
		prediction: number;
		timestamp: number;
		coins?: Hex;
	};
}) {
	const flip = args.provider.performCoinFlip(
		args.clientCommit,
		args.clientRand,
	);
	const transcript = args.provider.makeTranscript({
		...args.transcript,
		coins: flip.coins,
	});
	const mac = args.provider.computeMac(transcript);
	const bundle = args.provider.signBundle(transcript, mac);
	return { flip, transcript, bundle };
}
