import { describe, expect, it } from "bun:test";
import { poseidon2 } from "poseidon-lite";
import { hashBytes, hashPoseidonFields } from "../utils";

describe("Poseidon compatibility with Noir", () => {
	it("matches Noir circuit hash for [1, 2]", () => {
		const inputs = [1n, 2n];

		const tsHash = poseidon2(inputs);

		const noirHash =
			0x115cc0f5e7d690413df64c6b9662e9cf2a3617f2743245519e19607a4417189an;

		const tsHashHex = tsHash.toString(16).padStart(64, "0");
		const noirHashHex = noirHash.toString(16).padStart(64, "0");

		console.log("TypeScript hash:", tsHashHex);
		console.log("Noir hash:     ", noirHashHex);

		expect(tsHash).toBe(noirHash);
	});
	it("matches Noir circuit hash for Adult Income CSV rows (all numeric after encoding)", () => {
		// CSV: 90,0,77053,11,9,6,0,1,4,0,0,4356,40,39,0
		const row1Numeric = [
			90n, // age
			0n, // workclass (integer index)
			77053n, // fnlwgt
			11n, // education (integer index)
			9n, // education.num
			6n, // marital.status (integer index)
			0n, // occupation (integer index)
			1n, // relationship (integer index)
			4n, // race (integer index)
			0n, // sex (integer index)
			0n, // capital.gain
			4356n, // capital.loss
			40n, // hours.per.week
			39n, // native.country (integer index)
		];

		// Row 2 from dataset_encoded.csv (all integers)
		// CSV: 82,4,132870,11,9,6,4,1,4,0,0,4356,18,39,0
		const row2Numeric = [
			82n, // age
			4n, // workclass (integer index)
			132870n, // fnlwgt
			11n, // education (integer index)
			9n, // education.num
			6n, // marital.status (integer index)
			4n, // occupation (integer index)
			1n, // relationship (integer index)
			4n, // race (integer index)
			0n, // sex (integer index)
			0n, // capital.gain
			4356n, // capital.loss
			18n, // hours.per.week
			39n, // native.country (integer index)
		];

		const noir_hash_row1 =
			0x1d3bd4071f0da9ed47ac1f93087c6ba8160907a8cbad3a35339893e17ff1b470n;
		const noir_hash_row2 =
			0x020e7f792d3fc3b059d40bfea45ee7dc363a1565f6484c8593691c7c02d534f1n;

		console.log("\n=== Row 1 (from CSV) ===");
		const row1HashHex = hashPoseidonFields(row1Numeric);
		const row1Hash = BigInt(`0x${row1HashHex}`);
		console.log("TypeScript Poseidon hash: 0x" + row1HashHex);
		console.log(
			"Expected Noir hash:      0x" +
				noir_hash_row1.toString(16).padStart(64, "0"),
		);

		console.log("\n=== Row 2 (from CSV) ===");
		const row2HashHex = hashPoseidonFields(row2Numeric);
		const row2Hash = BigInt(`0x${row2HashHex}`);
		console.log("TypeScript Poseidon hash: 0x" + row2HashHex);
		console.log(
			"Expected Noir hash:      0x" +
				noir_hash_row2.toString(16).padStart(64, "0"),
		);

		// Verify hashes match Noir circuit
		expect(row1Hash).toBe(noir_hash_row1);
		expect(row2Hash).toBe(noir_hash_row2);
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

// below is the noir code used for testing
/**
use dep::poseidon::poseidon::bn254;
use dep::std;

#[test]
fn test_adult_income_row_hash() {
    // Row 1: age=90, workclass=0, fnlwgt=77053, education=11, education.num=9, marital.status=6, occupation=0, relationship=1, race=4, sex=0, capital.gain=0, capital.loss=4356, hours.per.week=40, native.country=39
    let row1_inputs = [90, 0, 77053, 11, 9, 6, 0, 1, 4, 0, 0, 4356, 40, 39];
    let row1_hash = bn254::hash_14(row1_inputs);
    std::println(row1_hash);

    // Row 2: age=82, workclass=4, fnlwgt=132870, education=11, education.num=9, marital.status=6, occupation=4, relationship=1, race=4, sex=0, capital.gain=0, capital.loss=4356, hours.per.week=18, native.country=39
    let row2_inputs = [82, 4, 132870, 11, 9, 6, 4, 1, 4, 0, 0, 4356, 18, 39];
    let row2_hash = bn254::hash_14(row2_inputs);
    std::println(row2_hash);
}

 */
