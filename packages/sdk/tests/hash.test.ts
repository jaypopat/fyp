import { describe, it, expect } from 'bun:test';
import { hashBytes } from '../utils';

describe('hashBytes', () => {
  it('hashes with SHA-256 and BLAKE2b producing different outputs', async () => {
    const data = new TextEncoder().encode('hello-world');
    const sha = await hashBytes(data, 'SHA-256');
    const blake = await hashBytes(data, 'BLAKE2b');
    expect(sha).not.toBe(blake);
    expect(sha.length).toBe(blake.length);
  });
});
