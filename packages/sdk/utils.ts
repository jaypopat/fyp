import os from "node:os";
import path from "node:path";
import { poseidon1, poseidon2, poseidon3, poseidon4, poseidon5, poseidon6, poseidon7, poseidon8, poseidon9, poseidon10, poseidon11, poseidon12, poseidon13, poseidon14, poseidon15, poseidon16} from "poseidon-lite";
import Papa from "papaparse";
import type { Hash } from "viem";


/**
 * Call the appropriate Poseidon hash function based on input length
 */
function poseidon(inputs: bigint[]): bigint {
    switch (inputs.length) {
        case 1: return poseidon1(inputs);
        case 2: return poseidon2(inputs);
        case 3: return poseidon3(inputs);
        case 4: return poseidon4(inputs);
        case 5: return poseidon5(inputs);
        case 6: return poseidon6(inputs);
        case 7: return poseidon7(inputs);
        case 8: return poseidon8(inputs);
        case 9: return poseidon9(inputs);
        case 10: return poseidon10(inputs);
        case 11: return poseidon11(inputs);
        case 12: return poseidon12(inputs);
        case 13: return poseidon13(inputs);
        case 14: return poseidon14(inputs);
        case 15: return poseidon15(inputs);
        case 16: return poseidon16(inputs);
        default: throw new Error(`Poseidon supports 1-16 inputs, got ${inputs.length}`);
    }
}


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

/**
 * Hash bytes using Poseidon (ZK-friendly hash)
 * Converts bytes to field elements and hashes them
 */
export function hashBytes(data: Uint8Array): string {
    // Split data into chunks that fit in a field element (< 254 bits)
    // We use 31 bytes per chunk to be safe
    const CHUNK_SIZE = 31;
    const chunks: bigint[] = [];

    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        // Convert chunk to bigint
        let value = 0n;
        for (let j = 0; j < chunk.length; j++) {
            value = (value << 8n) | BigInt(chunk[j] || 0);
        }
        chunks.push(value);
    }

    // Hash all chunks together
    const hash = poseidon(chunks);

    // Convert to 32-byte hex string (64 chars)
    const hex = hash.toString(16).padStart(64, "0");

    if (hex.length > 64) {
        // This should never happen: Poseidon outputs fit in 32 bytes.
        throw new Error(`Unexpected Poseidon hash length ${hex.length} > 64`);
    }

    return hex;
}

/**
 * Hash field elements directly using Poseidon (ZK-friendly)
 * Converts numeric values to field elements with fixed-point scaling for floats
 * 
 * @param values - Array of numbers, strings, or bigints to hash
 * @returns 64-character hex string (no 0x prefix)
 */
export function hashPoseidonFields(
    values: Array<number | string | bigint>,
): string {
    // Fixed-point scaling for float conversion (6 decimals)
    const SCALE = 1_000_000;

    // BN254 field modulus
    const BN254_FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

    // Convert all values to bigints
    const fields = values.map((v) => {
        if (typeof v === "bigint") {
            // Ensure bigint fits in field
            return v % BN254_FIELD_MODULUS;
        }
        if (typeof v === "string") {
            // Try to parse as number first
            const parsed = Number(v);
            if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
                // Numeric string - use fixed-point scaling
                return BigInt(Math.round(parsed * SCALE));
            }
            // Non-numeric string: use a simple hash
            // Convert to bytes and take first 31 bytes (248 bits) to fit in field
            const bytes = new TextEncoder().encode(v);
            let bigIntValue = 0n;
            // Only use first 31 bytes to stay within field size
            const maxBytes = Math.min(bytes.length, 31);
            for (let i = 0; i < maxBytes; i++) {
                bigIntValue = (bigIntValue << 8n) | BigInt(bytes[i] || 0);
            }
            return bigIntValue;
        }
        if (typeof v === "number") {
            // Handle floats with fixed-point arithmetic
            if (!Number.isFinite(v)) {
                throw new Error(`Invalid number value: ${v}`);
            }
            return BigInt(Math.round(v * SCALE));
        }
        throw new Error(`Unsupported value type: ${typeof v}`);
    });

    // Hash the field elements
    const hash = poseidon(fields);

    // Convert to 32-byte hex string (64 chars)
    const hex = hash.toString(16).padStart(64, "0");

    if (hex.length > 64) {
        // This should never happen: Poseidon outputs fit in 32 bytes.
        throw new Error(`Unexpected Poseidon hash length ${hex.length} > 64`);
    }

    return hex;
}

export function getArtifactDir(weightsHash: Hash): string {
    const home = os.homedir();
    return path.join(home, ".zkfair", weightsHash.slice(2));
}
