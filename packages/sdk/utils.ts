import os from "node:os";
import path from "node:path";
import { buildPoseidon } from "circomlibjs";
import Papa from "papaparse";
import type { Hash } from "viem";

let poseidonInstance: Awaited<ReturnType<typeof buildPoseidon>> | null = null;

/**
 * Get or initialize Poseidon hash function
 */
async function getPoseidon() {
	if (!poseidonInstance) {
		poseidonInstance = await buildPoseidon();
	}
	return poseidonInstance;
}

export async function parseCSV(filePath: string): Promise<string[][]> {
	const csvText = await Bun.file(filePath).text();
	const parsed = Papa.parse<string[]>(csvText, {
		skipEmptyLines: true,
		header: false,
	});
	if (parsed.errors.length) {
		throw new Error(
			`Error parsing CSV: ${parsed.errors.map((e) => e.message).join(", ")}`,
		);
	}

	const [_header, ...dataRows] = parsed.data;
	return dataRows;
}

export function bytesToHash(bytes: Uint8Array): Hash {
	return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}` as Hash;
}

export function bytesToPlainHash(bytes: Uint8Array): string {
	return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: Hash | string): Uint8Array {
	if (!hex.startsWith("0x")) throw new Error("Hash string must start with 0x");
	const clean = hex.slice(2);
	if (clean.length % 2 !== 0) throw new Error("Invalid hex length");
	const out = new Uint8Array(clean.length / 2);
	for (let i = 0; i < out.length; i++)
		out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
	return out;
}

/**
 * Hash bytes using Poseidon (ZK-friendly hash)
 * Converts bytes to field elements and hashes them
 */
export async function hashBytes(data: Uint8Array): Promise<string> {
	const poseidon = await getPoseidon();

	// Split data into chunks that fit in a field element (< 254 bits)
	// We use 31 bytes per chunk to be safe
	const CHUNK_SIZE = 31;
	const chunks: bigint[] = [];

	for (let i = 0; i < data.length; i += CHUNK_SIZE) {
		const chunk = data.slice(i, i + CHUNK_SIZE);
		// Convert chunk to bigint
		let value = 0n;
		for (let j = 0; j < chunk.length; j++) {
			value = (value << 8n) | BigInt(chunk[j] || 0);
		}
		chunks.push(value);
	}

	// Hash all chunks together
	const hash = poseidon(chunks);

	// Convert to 32-byte hex string (64 chars)
	const hashBigInt = poseidon.F.toObject(hash);
	const hex = hashBigInt.toString(16).padStart(64, "0");

	if (hex.length > 64) {
		// If somehow we get more than 64 chars, take last 64
		return hex.slice(-64);
	}

	return hex;
}

export function getArtifactDir(weightsHash: Hash): string {
	const home = os.homedir();
	return path.join(home, ".zkfair", weightsHash.slice(2));
}
