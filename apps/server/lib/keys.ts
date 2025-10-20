import type { ProviderKeys } from "@zkfair/itmac";
import {
	generateProviderKeys,
	loadProviderKeysFromDisk,
	saveProviderKeysToDisk,
} from "@zkfair/itmac/keys";
import type { Hex } from "viem";

export async function ensureProviderKeys(): Promise<ProviderKeys> {
	// 1) Try ~/.zkfair/provider/keys.json
	const disk = await loadProviderKeysFromDisk();
	if (disk) return disk;
	// 2) Try env
	const pk = process.env.PROVIDER_PRIV as Hex | undefined;
	const pub = process.env.PROVIDER_PUB as Hex | undefined;
	const mac = process.env.PROVIDER_MAC as Hex | undefined;
	if (pk && pub && mac) return { privateKey: pk, publicKey: pub, macKey: mac };
	// 3) Generate fresh for local dev
	const gen = generateProviderKeys();
	await saveProviderKeysToDisk(gen);
	console.log("🔐 Generated provider keys at ~/.zkfair/provider/keys.json");
	return gen;
}
