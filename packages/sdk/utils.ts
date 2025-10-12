import os from "node:os";
import path from "node:path";
import { blake2b } from "@noble/hashes/blake2";
import Papa from "papaparse";
import type { Hash } from "viem";
import type { hashAlgos } from "./types";

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

export async function hashBytes(
	data: Uint8Array,
	algo: hashAlgos,
): Promise<string> {
	// plain hex
	let out: Uint8Array;
	if (algo === "SHA-256") {
		const buf = await crypto.subtle.digest("SHA-256", data);
		out = new Uint8Array(buf);
	} else {
		out = blake2b(data, { dkLen: 32 });
	}
	const hex = bytesToPlainHash(out).toLowerCase();
	if (hex.length !== 64)
		throw new Error(`hashBytes produced invalid length ${hex.length}`);
	return hex;
}

export function getArtifactDir(weightsHash: Hash): string {
	const home = os.homedir();
	return path.join(home, ".zkfair", weightsHash.slice(2));
}
