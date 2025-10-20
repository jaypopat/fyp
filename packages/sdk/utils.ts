import os from "node:os";
import path from "node:path";
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
	const out = (algo === "SHA-256") 
		? Bun.sha(data) as Uint8Array
		: new Uint8Array(new Bun.CryptoHasher("blake2b256").update(data).digest());
	
	const hex = bytesToPlainHash(out).toLowerCase();
	if (hex.length !== 64)
		throw new Error(`hashBytes produced invalid length ${hex.length}`);
	return hex;
}

export function getArtifactDir(weightsHash: Hash): string {
	const home = os.homedir();
	return path.join(home, ".zkfair", weightsHash.slice(2));
}
