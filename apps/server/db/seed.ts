import { createBatchIfNeeded } from "../lib/batch.service";
import type { Hex } from "../lib/types";
import { db } from "./client";
import { queryLogs } from "./schema";

const count = Number(process.env.SEED_COUNT) || 100;

console.log(`Seeding ${count} queries...`);

const modelId = 1; // Using the adult-income model
const startTime = Date.now();

// Prepare query data
const queries = [];
for (let i = 0; i < count; i++) {
	// Generate random input that looks like the adult-income features
	const randomInput = Array.from({ length: 14 }, () => Math.random() * 100);

	// Hash the input (using JSON encoding, standardized)
	const asF32 = Array.from(new Float32Array(randomInput));
	const inputHashBytes = Bun.sha(
		new TextEncoder().encode(JSON.stringify(asF32)),
	) as Uint8Array;
	const inputHash = `0x${[...inputHashBytes]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")}` as Hex;

	// Generate random prediction (0 or 1 for binary classification)
	const prediction = Math.random() > 0.5 ? 1 : 0;

	// Generate unique query ID
	const queryId =
		globalThis.crypto?.randomUUID?.() ?? `query-${i}-${Date.now()}`;

	queries.push({
		queryId,
		modelId,
		inputHash,
		features: [1, 2, 3],
		sensitiveAttr: Math.random() > 0.5 ? 1 : 0, // Random sensitive attribute
		prediction,
		timestamp: Date.now() + i, // Slightly increment timestamp
	});
}

// Insert all queries
await db.insert(queryLogs).values(queries);

const duration = Date.now() - startTime;
console.log(`Successfully seeded ${count} queries in ${duration}ms`);
console.log(`Average: ${(duration / count).toFixed(2)}ms per query`);

// Now trigger batch creation for any unbatched queries
console.log("\nChecking for batch creation...");
let batchCount = 0;
while (true) {
	const batch = await createBatchIfNeeded();
	if (!batch) {
		break;
	}
	batchCount++;
	console.log(`  Created batch ${batch.id}`);
}

if (batchCount > 0) {
	console.log(`Created ${batchCount} batch(es)`);
	console.log(" Done!");
} else {
	console.log(
		`No batches created (need ${process.env.BATCH_SIZE || 100} unbatched queries for a batch)`,
	);
}

process.exit(0);
