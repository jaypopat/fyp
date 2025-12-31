import { provider } from "../lib/sdk";
import { db } from "./client";
import { schema } from "./schema";

const count = Number(process.env.SEED_COUNT) || 200;

console.log(`Seeding ${count} queries...`);

const modelId = 1; // adult-income model
const startTime = Date.now();

const queries = [];
for (let i = 0; i < count; i++) {
	const features = Array.from({ length: 14 }, () =>
		Math.round(Math.random() * 100),
	);

	// Generate random prediction (0 or 1 for binary classification)
	const prediction = Math.random() > 0.5 ? 1 : 0;

	queries.push({
		modelId,
		features,
		sensitiveAttr: Math.random() > 0.5 ? 1 : 0,
		prediction,
		timestamp: Date.now() + i,
	});
}

await db.insert(schema.zkfairQueryLogs).values(queries);

const duration = Date.now() - startTime;
console.log(`Successfully seeded ${count} queries in ${duration}ms`);
console.log(`Average: ${(duration / count).toFixed(2)}ms per query`);

console.log("\nChecking for batch creation...");
let batchCount = 0;
while (true) {
	const batch = await provider.createBatchIfNeeded();
	if (!batch) {
		break;
	}
	batchCount++;
	console.log(`  Created batch ${batch.batch.id}`);
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
