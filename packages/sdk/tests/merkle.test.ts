import { describe, expect, it } from "bun:test";
import { createMerkleProof, merkleRoot, verifyMerkleProof } from "../merkle";
import { hashBytes } from "../utils";

// Leaves must be pre-hashed 32-byte values represented as 64 hex chars (no 0x)
async function makeLeaf(content: string) {
	const enc = new TextEncoder().encode(content);
	const digest = await hashBytes(enc, "SHA-256"); // now plain 64 hex
	if (digest.length !== 64) throw new Error("Unexpected leaf hash length");
	console.log(`[leaf] content='${content}' -> ${digest}`);
	return digest; // already plain
}

describe("Merkle Root & Proofs", () => {
	it("computes root for single leaf", async () => {
		const leaf = await makeLeaf("a");
		const root = await merkleRoot([leaf], "SHA-256");
		expect(root).toBeString();
		expect(root.startsWith("0x")).toBeTrue();
		console.log(`[test] single leaf root=${root}`);
	});

	it("duplicates odd leaf", async () => {
		const l1 = await makeLeaf("x");
		const l2 = await makeLeaf("y");
		const l3 = await makeLeaf("z");

		const rootOdd = await merkleRoot([l1, l2, l3], "SHA-256");
		// Explicitly duplicate last leaf to simulate manual duplication
		const rootManual = await merkleRoot([l1, l2, l3, l3], "SHA-256");

		expect(rootOdd).toBe(rootManual);
		console.log(`[test] odd duplication root=${rootOdd}`);
	});

	it("builds and verifies inclusion proof (even count)", async () => {
		const leaves = await Promise.all(["a", "b", "c", "d"].map(makeLeaf));
		const targetIndex = 2; // 'c'
		const { root, proof } = await createMerkleProof(
			leaves,
			targetIndex,
			"SHA-256",
		);
		const leaf = leaves[targetIndex];
		if (!leaf) throw new Error("Test leaf missing");
		const ok = await verifyMerkleProof(
			leaf,
			root as `0x${string}`,
			proof,
			"SHA-256",
		);
		expect(ok).toBeTrue();
		console.log(
			`[test] inclusion even ok=${ok} root=${root} proofSteps=${proof.length}`,
		);
	});

	it("builds and verifies inclusion proof (odd count with duplication)", async () => {
		const leaves = await Promise.all(["m", "n", "o"].map(makeLeaf));
		const targetIndex = 2; // last leaf triggers duplication path
		const { root, proof } = await createMerkleProof(
			leaves,
			targetIndex,
			"SHA-256",
		);
		const leaf = leaves[targetIndex];
		if (!leaf) throw new Error("Test leaf missing");
		const ok = await verifyMerkleProof(
			leaf,
			root as `0x${string}`,
			proof,
			"SHA-256",
		);
		expect(ok).toBeTrue();
		console.log(
			`[test] inclusion odd ok=${ok} root=${root} proofSteps=${proof.length}`,
		);
	});

	it("fails verification when proof is tampered", async () => {
		const leaves = await Promise.all(["q", "r", "s", "t"].map(makeLeaf));
		const targetIndex = 1;
		const { root, proof } = await createMerkleProof(
			leaves,
			targetIndex,
			"SHA-256",
		);
		// Corrupt first sibling by flipping last hex nibble
		const bad = proof.map((p) => ({ ...p }));
		if (bad.length === 0) throw new Error("Proof unexpectedly empty");
		const first = bad[0];
		if (!first || !first.sibling)
			throw new Error("First proof element missing");
		const sibHex = first.sibling.startsWith("0x")
			? first.sibling.slice(2)
			: first.sibling;
		const flipped = sibHex.slice(0, 63) + (sibHex[63] === "0" ? "1" : "0");
		first.sibling = `0x${flipped}`;
		const leaf = leaves[targetIndex];
		if (!leaf) throw new Error("Test leaf missing");
		const ok = await verifyMerkleProof(
			leaf,
			root as `0x${string}`,
			bad,
			"SHA-256",
		);
		expect(ok).toBeFalse();
		console.log(`[test] tamper expectedFail ok=${ok} root=${root}`);
	});
});
