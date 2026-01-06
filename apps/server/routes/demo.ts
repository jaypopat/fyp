import { zValidator } from "@hono/zod-validator";
import type { AuditRecord, BatchResult } from "@zkfair/sdk";
import {
	type NewBatch,
	type QueryLog,
	zkfairBatches,
	zkfairQueryLogs,
} from "@zkfair/sdk/schema";
import { asc, inArray, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { provider } from "../lib/sdk";

export type DemoMode = "honest" | "non-inclusion" | "fraudulent-inclusion";

let currentDemoMode: DemoMode = "honest";

export function getDemoMode(): DemoMode {
	return currentDemoMode;
}

export const demoRoutes = new Hono();

demoRoutes.get("/mode", (c) => {
	return c.json({ mode: currentDemoMode });
});

demoRoutes.post(
	"/mode",
	zValidator(
		"json",
		z.object({
			mode: z.enum(["honest", "non-inclusion", "fraudulent-inclusion"]),
		}),
	),
	async (c) => {
		const { mode } = c.req.valid("json");

		currentDemoMode = mode;
		console.log(`[Demo] Mode set to: ${mode}`);

		return c.json({
			mode: currentDemoMode,
			message: `Demo mode set to ${mode}`,
		});
	},
);

demoRoutes.post("/commit-batch", async (c) => {
	try {
		console.log(
			`[Demo] Manual batch commit triggered (mode: ${currentDemoMode})`,
		);

		let result: BatchResult | undefined;
		if (currentDemoMode === "honest") {
			// Normal batch creation
			result = await provider.createBatchIfNeeded(true);
		} else {
			// Fraudulent batch creation
			result = await createFraudulentBatch(currentDemoMode);
		}

		if (result) {
			return c.json({
				success: true,
				message: `Batch committed (${currentDemoMode})`,
				mode: currentDemoMode,
				batchId: result.batch.id,
			});
		}
		return c.json({
			success: false,
			message: "No queries to batch",
		});
	} catch (error) {
		console.error("[Demo] Batch commit error:", error);
		return c.json({ error: (error as Error).message }, 500);
	}
});

/**
 * Create a fraudulent batch for demo purposes
 * - non-inclusion: Excludes the last query from the batch range
 * - fraudulent-inclusion: Tampers with prediction value in Merkle tree
 */
export async function createFraudulentBatch(
	mode: DemoMode,
): Promise<BatchResult | undefined> {
	// Get unbatched queries
	const queries = await db
		.select()
		.from(zkfairQueryLogs)
		.where(isNull(zkfairQueryLogs.batchId))
		.orderBy(asc(zkfairQueryLogs.seq))
		.limit(100);

	if (queries.length === 0) return undefined;

	const sequences = queries.map((q) => q.seq);
	const sorted = [...sequences].sort((a, b) => a - b);

	let startSeq: number;
	let endSeq: number;
	let auditRecords: AuditRecord[];
	let batchSequences: number[];

	if (mode === "non-inclusion") {
		if (queries.length < 2) {
			console.log(
				"[Fraud] Not enough queries for non-inclusion fraud (need at least 2)",
			);
			return undefined;
		}

		const firstSeq = sorted[0];
		const secondLastSeq = sorted[sorted.length - 2];
		if (firstSeq === undefined || secondLastSeq === undefined) {
			throw new Error("Invalid sequence numbers");
		}
		startSeq = firstSeq;
		endSeq = secondLastSeq; // Exclude last query from ON-CHAIN range

		// Build Merkle tree with all queries EXCEPT the last one
		const includedQueries = queries.slice(0, -1);
		auditRecords = includedQueries.map((q) => toAuditRecord(q));
		batchSequences = includedQueries.map((q) => q.seq);

		console.log(
			`[Fraud] Non-inclusion: Excluding seqNum ${sorted[sorted.length - 1]} from batch`,
		);
		console.log(
			`[Fraud] On-chain range: ${startSeq}-${endSeq}, but query ${sorted[sorted.length - 1]} exists in DB`,
		);
	} else {
		// FRAUDULENT-INCLUSION: Tamper with ONE query's prediction
		const firstSeq = sorted[0];
		const lastSeq = sorted[sorted.length - 1];
		if (firstSeq === undefined || lastSeq === undefined) {
			throw new Error("Invalid sequence numbers");
		}
		startSeq = firstSeq;
		endSeq = lastSeq;

		// Select the last query to tamper
		const tamperIdx = queries.length - 1;
		let tamperedSeq: number | undefined;
		let tamperedPrediction: number | undefined;

		// Build audit records with TAMPERED data for the selected query
		auditRecords = queries.map((q, idx) => {
			const record = toAuditRecord(q);
			// Tamper with only one query's prediction
			if (idx === tamperIdx) {
				const originalPrediction = record.prediction;
				record.prediction = originalPrediction === 0 ? 1 : 0; // Flip the prediction
				tamperedSeq = q.seq;
				tamperedPrediction = record.prediction;
				console.log(
					`[Fraud] Fraudulent inclusion: Tampered seqNum ${q.seq} - changed prediction from ${originalPrediction} to ${record.prediction}`,
				);
			}
			return record;
		});

		// CRITICAL: Update DB with tampered prediction so proof generation uses same data
		if (tamperedSeq !== undefined && tamperedPrediction !== undefined) {
			await db
				.update(zkfairQueryLogs)
				.set({ prediction: tamperedPrediction })
				.where(inArray(zkfairQueryLogs.seq, [tamperedSeq]));
			console.log(
				`[Fraud] Persisted tampered prediction ${tamperedPrediction} for seqNum ${tamperedSeq}`,
			);
		}

		batchSequences = sequences;
	}

	const batchId = `${startSeq}-${endSeq}`;

	// Build Merkle tree with (potentially tampered) records
	const { root } = await provider.sdk.audit.buildBatch(auditRecords);

	const modelId = queries[0]?.modelId;
	if (!modelId) {
		throw new Error("No model ID found in queries");
	}

	// Create batch record
	const batchData: NewBatch = {
		id: batchId,
		startSeq,
		endSeq,
		merkleRoot: root,
		recordCount: auditRecords.length,
		txHash: null,
		createdAt: Date.now(),
		committedAt: null,
	};

	const [batch] = await db.insert(zkfairBatches).values(batchData).returning();
	if (!batch) throw new Error("Failed to create batch");

	// Assign queries to batch (all of them, including ones we're cheating on)
	if (batchSequences.length > 0) {
		await db
			.update(zkfairQueryLogs)
			.set({ batchId })
			.where(inArray(zkfairQueryLogs.seq, batchSequences));
	}

	// Commit to blockchain with the fraudulent data
	const txHash = await provider.sdk.audit.commitBatch(
		BigInt(modelId),
		root,
		BigInt(auditRecords.length),
		BigInt(startSeq),
		BigInt(endSeq),
	);

	// Mark as committed
	await db
		.update(zkfairBatches)
		.set({ txHash, committedAt: Date.now() })
		.where(inArray(zkfairBatches.id, [batchId]));

	console.log(`[Fraud] Batch ${batchId} committed with mode: ${mode}`);

	return {
		batch: { ...batch, txHash, committedAt: Date.now() },
		txHash,
		root,
		recordCount: auditRecords.length,
	};
}

function toAuditRecord(query: QueryLog): AuditRecord {
	return {
		seqNum: query.seq,
		modelId: query.modelId,
		features: query.features,
		sensitiveAttr: query.sensitiveAttr,
		prediction: query.prediction,
		timestamp: query.timestamp,
	};
}
