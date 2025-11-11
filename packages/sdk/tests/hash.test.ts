import { describe, expect, it } from "bun:test";
import { hashBytes } from "../utils";

describe("hashBytes", () => {
	it("hashes with Poseidon (ZK-friendly)", async () => {
		const data = new TextEncoder().encode("hello-world");
		const hash = await hashBytes(data);
		// Poseidon hash produces 64-character hex string (32 bytes)
		expect(hash.length).toBe(64);
		expect(/^[0-9a-f]{64}$/i.test(hash)).toBe(true);
	});

	it("produces consistent hashes for same input", async () => {
		const data = new TextEncoder().encode("test-data");
		const hash1 = await hashBytes(data);
		const hash2 = await hashBytes(data);
		expect(hash1).toBe(hash2);
	});
});
