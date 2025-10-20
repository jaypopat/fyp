import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { secp256k1 } from "@noble/curves/secp256k1";
import { bytesToHex } from "@noble/hashes/utils";
import type { Hex, ProviderKeys } from "./types";

function toHex(u8: Uint8Array): Hex {
	return `0x${bytesToHex(u8)}` as Hex;
}

export function generateProviderKeys(): ProviderKeys {
	// Secp256k1 private key
	const priv = secp256k1.utils.randomPrivateKey();
	const pub = secp256k1.getPublicKey(priv, true); // compressed

	// HMAC key (32 bytes)
	const macKey = crypto.getRandomValues(new Uint8Array(32)) as Uint8Array;

	return {
		privateKey: toHex(priv),
		publicKey: toHex(pub),
		macKey: toHex(macKey),
	};
}

export function getProviderKeysPath(): string {
	return path.join(os.homedir(), ".zkfair", "provider", "keys.json");
}

export async function loadProviderKeysFromDisk(): Promise<ProviderKeys | null> {
	const p = getProviderKeysPath();
	const f = Bun.file(p);
	if (!(await f.exists())) return null;
	try {
		const json = await f.json();
		return json as ProviderKeys;
	} catch {
		return null;
	}
}

export async function saveProviderKeysToDisk(
	keys: ProviderKeys,
): Promise<string> {
	const p = getProviderKeysPath();
	const dir = path.dirname(p);
	await mkdir(dir, { recursive: true });
	await Bun.write(p, JSON.stringify(keys, null, 2));
	return p;
}
