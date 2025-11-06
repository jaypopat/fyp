import { encode } from "@msgpack/msgpack";
import type { QueryTranscript } from "./types";
import { hexToBytes } from "./utils";

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
