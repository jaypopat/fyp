import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import * as ort from "onnxruntime-node";
import { getQueries, initDatabase, insertQuery } from "./db";
import { createBatchIfNeeded, toAuditRecord } from "./lib/batch.service";
import { loadAllModels } from "./lib/models";
import { sdk } from "./lib/sdk";
import type { Hex } from "./lib/types";

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

const models = await loadAllModels();

initDatabase();

sdk.events.watchAuditRequested(async (event) => {
	console.log("Audit requested:", event);
	try {
		const batchId = Number(event.batchId);
		const batchSize = Number(process.env.BATCH_SIZE || 100);

		const batchStartIndex = batchId * batchSize;

		const records = await getQueries({
			offset: batchStartIndex,
			limit: batchSize,
		});

		if (records.length === 0) {
			throw new Error(
				`No records found for batch at offset ${batchStartIndex}`,
			);
		}

		console.log(`Loaded ${records.length} records from database`);

		// 2. Convert to AuditRecord format for SDK
		const auditRecords = records.map(toAuditRecord);

		// 3. Build Merkle tree for the batch
		const { root } = await sdk.audit.buildBatch(auditRecords);
		console.log(`Built Merkle tree with root ${root}`);

		const dummyProof = `0x${"00".repeat(256)}`;
		const publicInputs: string[] = [];

		console.log("Generated fairness ZK proof (TODO: implement circuit)");

		console.log("Submitting proof to contract...");
		const _txHash = await sdk.audit.submitAuditProof(
			event.auditId,
			dummyProof as `0x${string}`,
			publicInputs as `0x${string}`[],
		);
	} catch (error) {
		console.error("Audit response failed:", error);
	}
});

// ============================================
// ENDPOINTS
// ============================================

app.get("/health", (c) => {
	return c.json({
		status: "ok",
		loadedModels: Array.from(models.keys()),
		timestamp: Date.now(),
	});
});

app.get("/models", (c) => {
	return c.json({
		models: Array.from(models.keys()).map((id) => ({
			modelId: id,
		})),
	});
});

/**
 * Inference endpoint
 */
app.post("/predict", async (c) => {
	try {
		const body = await c.req.json();
		const { modelId, input, queryId } = body as {
			modelId: number;
			input: unknown;
			queryId?: string;
		};

		// Validate input
		if (modelId === undefined || input === undefined) {
			return c.json({ error: "modelId and input are required" }, 400);
		}

		// For demo models, we expect a numeric array
		if (!Array.isArray(input)) {
			return c.json({ error: "input must be an array" }, 400);
		}

		// Get model
		const session = models.get(modelId);
		if (!session) {
			return c.json({ error: `Model ${modelId} not found` }, 404);
		}

		// Prepare input tensor
		const inputTensor = new ort.Tensor(
			"float32",
			Float32Array.from(input as number[]),
			[1, (input as number[]).length],
		);

		const results = await session.run({
			float_input: inputTensor,
		});

		const outputTensor = results.label || results.output0;
		const prediction = outputTensor?.data[0] as number;

		const now = Date.now();
		const asF32 = Array.from(new Float32Array(input as number[]));

		// TODO - change to poseidon hash
		const inputHashBytes = Bun.sha(
			new TextEncoder().encode(JSON.stringify(asF32)),
		) as Uint8Array;
		const inputHash =
			`0x${[...inputHashBytes].map((b) => b.toString(16).padStart(2, "0")).join("")}` as Hex;
		const qid = queryId ?? globalThis.crypto?.randomUUID?.() ?? `${now}`;

		console.log(`Inference for model ${modelId}: ${prediction}`);

		const seqNum = await insertQuery({
			queryId: qid,
			modelId: modelId,
			inputHash,
			prediction: Number(prediction),
			timestamp: now,
		});
		console.log(`Stored query ${qid} as sequence #${seqNum}`);

		await createBatchIfNeeded();

		return c.json({
			modelId,
			prediction: Number(prediction),
			timestamp: now,
			seqNum,
			inputHash,
			queryId: qid,
		});
	} catch (error) {
		console.error("Inference error:", error);
		return c.json(
			{
				error: (error as Error).message || "Inference failed",
			},
			500,
		);
	}
});

const port = Number(process.env.PORT) || 5000;

console.log("Starting ZKFair inference server...");

export default {
	port,
	fetch: app.fetch,
};

console.log(`Server running on http://localhost:${port}`);
