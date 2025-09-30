import { hexToBytes, hashBytes } from "./utils";
import type { CommitOptions } from "./types";

// Internal node domain separation prefix (leaves are treated as already-digested values)
const NODE_PREFIX = new Uint8Array([0x01]);

type hashAlgos = CommitOptions["schema"]["cryptoAlgo"];

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function ensure0x(h: string): `0x${string}` {
  return (h.startsWith("0x") ? h : `0x${h}`) as `0x${string}`;
}

// Returns plain 64-hex (no 0x) for internal nodes
async function hashNode(left: string, right: string, algo: hashAlgos) {
  const l = hexToBytes(ensure0x(left));
  const r = hexToBytes(ensure0x(right));
  return await hashBytes(concat(NODE_PREFIX, concat(l, r)), algo);
}

export async function merkleRoot(leaves: string[], algo: hashAlgos): Promise<`0x${string}`> {
  if (leaves.length === 0) throw new Error("No leaves provided");
  for (let i = 0; i < leaves.length; i++) {
    const leaf = leaves[i];
    if (typeof leaf !== 'string') {
      throw new Error(`Leaf at index ${i} missing`);
    }
    if (leaf.length !== 64) {
      throw new Error(`Leaf at index ${i} has invalid length ${leaf.length}, expected 64`);
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
      next.push(await hashNode(left, right, algo));
    }
    currentLevel = next;
  }
  const root = currentLevel[0];
  if (!root) throw new Error("Root computation failed");
  return ensure0x(root);
}

export async function verifyMerkleProof(leaf: string, root: `0x${string}`, proof: { sibling: string; position: 'left' | 'right' }[], algo: hashAlgos): Promise<boolean> {

  let current = leaf;
  for (const { sibling, position } of proof) {
    if (position === 'left') {
      current = await hashNode(sibling, current, algo);
    } else {
      current = await hashNode(current, sibling, algo);
    }
  }
  return ensure0x(current) === root;

}
// Creates a proof for the leaf at the given index. Returns the root and the proof steps.
export async function createMerkleProof(
  leaves: string[],
  index: number,
  algo: hashAlgos
): Promise<{ root: `0x${string}`; proof: { sibling: string; position: 'left' | 'right' }[] }> {
  if (leaves.length === 0) throw new Error('No leaves provided');
  if (index < 0 || index >= leaves.length) throw new Error('Index out of range');
  for (let i = 0; i < leaves.length; i++) {
    const leaf = leaves[i];
    if (typeof leaf !== 'string') throw new Error(`Leaf at index ${i} missing`);
    if (leaf.length !== 64) throw new Error(`Leaf at index ${i} has invalid length ${leaf.length}, expected 64`);
  }

  let level: string[] = leaves.slice(); // work on a copy
  let idx = index;
  const proof: { sibling: string; position: 'left' | 'right' }[] = [];

  while (level.length > 1) {
    const isLeft = (idx % 2 === 0);
    const siblingIdx = isLeft ? idx + 1 : idx - 1;
    const current = level[idx];
    if (!current) throw new Error('Internal: current node undefined');
    const sibling = level[siblingIdx] ?? current; // duplicate if missing (odd duplication path)
    proof.push({ sibling, position: isLeft ? 'right' : 'left' });

    // build next level
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      if (!left) throw new Error('Internal: left undefined');
      const right = level[i + 1] ?? left; // duplicate last if odd
      const parent = await hashNode(left, right, algo); // parent plain 64-hex
      next.push(parent);
    }
    level = next;
    idx = Math.floor(idx / 2);
  }
  const rootPlain = level[0];
  if (!rootPlain) throw new Error('Internal: root undefined');
  const root = ensure0x(rootPlain);
  return { root, proof };
}
