import { sleep } from "bun";

const SERVER_URL = "http://localhost:5000";
const MODEL_HASH =
	"0x09c72f51dff5a78d0789300c09349b0ee875c6463f047b19399b1d2a81f9b91a";

/**
 * Proxy bias test using known decision boundary
 * Tests Male+Husband vs Female+Wife at profiles where discrimination occurs
 *
 * Decision boundary characteristics:
 * - Age: 30-50, Education: 9-15 years, Capital gains: $3K-7K, Hours: 40-50/week
 * - These marginal profiles show maximum proxy discrimination
 */

async function predict(input: number[]): Promise<number | null> {
	try {
		const res = await fetch(`${SERVER_URL}/predict`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ modelHash: MODEL_HASH, input }),
		});
		const data = (await res.json()) as any;
		return data.prediction ?? null;
	} catch {
		return null;
	}
}

async function commitBatch(): Promise<void> {
	// Set demo mode to honest first
	await fetch(`${SERVER_URL}/demo/mode`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ mode: "honest" }),
	});

	// Commit the batch
	const res = await fetch(`${SERVER_URL}/demo/commit-batch`, {
		method: "POST",
	});
	const data = (await res.json()) as any;
	console.log("\n" + "=".repeat(50));
	if (data.batchId) {
		console.log(`✓ Batch committed: ${data.batchId}`);
	} else {
		console.log("No queries to batch");
	}
}

// Test profiles at known decision boundary (age, edu-years, cap-gain, hours)

// Identical age, education, capital gains, work hours
// Only difference: Male+Husband vs Female+Wife
// Consistent pattern: males approved, females rejected
const boundaryProfiles = [
	[30, 10, 3000, 40],
	[30, 10, 4000, 45],
	[30, 10, 5000, 40],
	[40, 10, 3000, 45],
	[40, 10, 4000, 40],
	[40, 10, 5000, 45],
	[50, 10, 4000, 40],
	[50, 10, 5000, 45],
];

const malePredictions: number[] = [];
const femalePredictions: number[] = [];
let biasedCount = 0;

console.log("Testing proxy bias at decision boundary...\n");

for (const [age, eduYears, capGain, hours] of boundaryProfiles) {
	// workclass=4, fnlwgt=150000, education=eduYears, edu-num=10, marital=2, occ=12, race=4, cap-loss=0, country=39
	// Male: relationship=0(Husband), sex=1
	const maleProfile = [
		age,
		4,
		150000,
		eduYears,
		10,
		2,
		12,
		0,
		4,
		1,
		capGain,
		0,
		hours,
		39,
	] as number[];

	// Female: relationship=5(Wife), sex=0
	const femaleProfile = [
		age,
		4,
		150000,
		eduYears,
		10,
		2,
		12,
		5,
		4,
		0,
		capGain,
		0,
		hours,
		39,
	] as number[];

	const malePred = await predict(maleProfile);
	await sleep(50);
	const femalePred = await predict(femaleProfile);
	await sleep(50);

	if (malePred !== null && femalePred !== null) {
		malePredictions.push(malePred);
		femalePredictions.push(femalePred);

		if (malePred !== femalePred) {
			biasedCount++;
			const mResult = malePred === 1 ? ">50K" : "≤50K";
			const fResult = femalePred === 1 ? ">50K" : "≤50K";
			console.log(
				`age=${age}, edu=${eduYears}yr, gain=$${capGain}, hrs=${hours}`,
			);
			console.log(`  Male: ${mResult} | Female: ${fResult}\n`);
		}
	}
}

const maleRate =
	malePredictions.filter((p) => p === 1).length / malePredictions.length;
const femaleRate =
	femalePredictions.filter((p) => p === 1).length / femalePredictions.length;
const disparity = Math.abs(maleRate - femaleRate);

console.log("=".repeat(50));
console.log(`Male approval: ${(maleRate * 100).toFixed(1)}%`);
console.log(`Female approval: ${(femaleRate * 100).toFixed(1)}%`);
console.log(`Disparity: ${(disparity * 100).toFixed(1)}%`);
console.log(`Biased cases: ${biasedCount}/${boundaryProfiles.length}`);
console.log(disparity > 0.05 ? "\nBIAS DETECTED" : "\nNo significant bias");

// Auto-commit batch for audit
await commitBatch();
console.log("Ready for audit challenge in web UI →  /model/" + MODEL_HASH);
