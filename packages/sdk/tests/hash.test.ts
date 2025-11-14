import { describe, expect, it } from "bun:test";
import { poseidon2 } from "poseidon-lite";
import { hashBytes, hashPoseidonFields } from "../utils";

describe("Poseidon compatibility with Noir", () => {
	it("matches Noir circuit hash for [1, 2]", () => {
		const inputs = [1n, 2n];

		const tsHash = poseidon2(inputs);

		// This is the hash from your Noir circuit: bn254::hash_2([1, 2])
		const noirHash =
			0x115cc0f5e7d690413df64c6b9662e9cf2a3617f2743245519e19607a4417189an;

		const tsHashHex = tsHash.toString(16).padStart(64, "0");
		const noirHashHex = noirHash.toString(16).padStart(64, "0");

		console.log("TypeScript hash:", tsHashHex);
		console.log("Noir hash:     ", noirHashHex);

		expect(tsHash).toBe(noirHash);
	});

	it("hashes with Poseidon (ZK-friendly)", () => {
		const data = new TextEncoder().encode("hello-world");
		const hash = hashBytes(data);
		expect(hash.length).toBe(64);
		expect(/^[0-9a-f]{64}$/i.test(hash)).toBe(true);
	});

	it("produces consistent hashes for same input", () => {
		const data = new TextEncoder().encode("test-data");
		const hash1 = hashBytes(data);
		const hash2 = hashBytes(data);
		expect(hash1).toBe(hash2);
	});
});
