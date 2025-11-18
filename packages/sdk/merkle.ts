import type { Hex } from "viem";
import { hashPoseidonFields } from "./utils";

function ensure0x(h: string): Hex {
	return (h.startsWith("0x") ? h : `0x${h}`) as Hex;
}

// Returns plain 64-hex (no 0x) for internal nodes using Poseidon
async function hashNode(left: string, right: string) {
	// Convert hex strings to bigints and hash with Poseidon
	const leftBigInt = BigInt(ensure0x(left));
	const rightBigInt = BigInt(ensure0x(right));
	return hashPoseidonFields([leftBigInt, rightBigInt]);
}

export async function merkleRoot(leaves: string[]): Promise<Hex> {
	if (leaves.length === 0) throw new Error("No leaves provided");
	for (let i = 0; i < leaves.length; i++) {
		const leaf = leaves[i];
		if (typeof leaf !== "string") {
			throw new Error(`Leaf at index ${i} missing`);
		}
		if (leaf.length !== 64) {
			throw new Error(
				`Leaf at index ${i} has invalid length ${leaf.length}, expected 64`,
			);
		}
	}

	let currentLevel = leaves;
	while (currentLevel.length > 1) {
		const next: string[] = [];
		for (let i = 0; i < currentLevel.length; i += 2) {
			const left = currentLevel[i];
			if (!left) throw new Error("Unexpected undefined left node");
			const candidateRight = currentLevel[i + 1];
			const right = candidateRight ?? left; // duplicate last if odd
			next.push(await hashNode(left, right));
		}
		currentLevel = next;
	}
	const root = currentLevel[0];
	if (!root) throw new Error("Root computation failed");
	return ensure0x(root);
}

export async function verifyMerkleProof(
	leaf: string,
	root: Hex,
	proof: { sibling: string; position: "left" | "right" }[],
): Promise<boolean> {
	let current = leaf;
	for (const { sibling, position } of proof) {
		if (position === "left") {
			current = await hashNode(sibling, current);
		} else {
			current = await hashNode(current, sibling);
		}
	}
	return ensure0x(current) === root;
}
// Creates a proof for the leaf at the given index. Returns the root and the proof steps.
export async function createMerkleProof(
	leaves: string[],
	index: number,
): Promise<{
	root: Hex;
	proof: { sibling: string; position: "left" | "right" }[];
}> {
	if (leaves.length === 0) throw new Error("No leaves provided");
	if (index < 0 || index >= leaves.length)
		throw new Error("Index out of range");
	for (let i = 0; i < leaves.length; i++) {
		const leaf = leaves[i];
		if (typeof leaf !== "string") throw new Error(`Leaf at index ${i} missing`);
		if (leaf.length !== 64)
			throw new Error(
				`Leaf at index ${i} has invalid length ${leaf.length}, expected 64`,
			);
	}

	let level: string[] = leaves.slice(); // work on a copy
	let idx = index;
	const proof: { sibling: string; position: "left" | "right" }[] = [];

	while (level.length > 1) {
		const isLeft = idx % 2 === 0;
		const siblingIdx = isLeft ? idx + 1 : idx - 1;
		const current = level[idx];
		if (!current) throw new Error("Internal: current node undefined");
		const sibling = level[siblingIdx] ?? current; // duplicate if missing (odd duplication path)
		proof.push({ sibling, position: isLeft ? "right" : "left" });

		// build next level
		const next: string[] = [];
		for (let i = 0; i < level.length; i += 2) {
			const left = level[i];
			if (!left) throw new Error("Internal: left undefined");
			const right = level[i + 1] ?? left; // duplicate last if odd
			const parent = await hashNode(left, right); // parent plain 64-hex
			next.push(parent);
		}
		level = next;
		idx = Math.floor(idx / 2);
	}
	const rootPlain = level[0];
	if (!rootPlain) throw new Error("Internal: root undefined");
	const root = ensure0x(rootPlain);
	return { root, proof };
}

/**
 * Generate all Merkle proofs for every leaf in the tree.
 * Returns arrays suitable for circuit input (merkle_paths and is_even_flags).
 */
export async function generateAllMerkleProofs(
	leaves: string[],
	maxTreeHeight: number,
): Promise<{
	merkle_paths: string[][];
	is_even_flags: boolean[][];
}> {
	const merkle_paths: string[][] = [];
	const is_even_flags: boolean[][] = [];

	for (let i = 0; i < leaves.length; i++) {
		const { proof } = await createMerkleProof(leaves, i);

		// Convert proof to circuit format
		const path: string[] = new Array(maxTreeHeight).fill("0");
		const flags: boolean[] = new Array(maxTreeHeight).fill(false);

		for (let j = 0; j < proof.length && j < maxTreeHeight; j++) {
			const step = proof[j];
			if (!step) continue;
			path[j] = ensure0x(step.sibling);
			// is_even means "current node is left child" (even index)
			flags[j] = step.position === "right"; // if sibling is right, current is left (even)
		}

		merkle_paths.push(path);
		is_even_flags.push(flags);
	}

	return { merkle_paths, is_even_flags };
}
