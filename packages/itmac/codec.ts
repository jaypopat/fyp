import { encode } from "@msgpack/msgpack";
import type { Hex, QueryTranscript } from "./types";

export function hexToBytes(hex: Hex): Uint8Array {
	const h = hex.startsWith("0x") ? hex.slice(2) : hex;
	const out = new Uint8Array(h.length / 2);
	for (let i = 0; i < out.length; i++)
		out[i] = Number.parseInt(h.slice(i * 2, i * 2 + 2), 16);
	return out;
}

export function f32(n: number): number {
	const arr = new Float32Array(1);
	arr[0] = n;
	return arr[0];
}

// Domain-separated, positional transcript tuple for canonical encoding
export function encodeTranscript(t: QueryTranscript): Uint8Array {
	const tuple: unknown[] = [
		"ZKFAIR:ITMAC:V1",
		t.queryId,
		t.modelId,
		hexToBytes(t.inputHash),
		f32(t.prediction),
		t.timestamp,
		hexToBytes(t.coins),
	];
	return encode(tuple);
}
