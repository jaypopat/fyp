import { encode } from "@msgpack/msgpack";
import { Provider } from "@zkfair/itmac";
import { SDK } from "@zkfair/sdk";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import * as ort from "onnxruntime-node";
import { appendRecord, initDB, type QueryLogRecord } from "./lib/db";
import { makeItmacBundle, verifyClientCommitment } from "./lib/itmac";
import { ensureProviderKeys } from "./lib/keys";
import { loadAllModels } from "./lib/models";

type Hex = `0x${string}`;
const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", logger());

// Load all models on startup
const models = await loadAllModels();

// Init DB and provider keys
await initDB();
const providerKeys = await ensureProviderKeys();
const itmacProvider = new Provider(providerKeys);

const sdk = new SDK({
	contractAddress: process.env.CONTRACT_ADDRESS as Hex,
	privateKey: process.env.PRIVATE_KEY as Hex,
	rpcUrl: process.env.RPC_URL || "http://localhost:8545",
});

// Watch for audit requests - this is the only event the provider needs to respond to
sdk.events.watchAuditRequested(async (event) => {
	console.log("🔍 Audit requested:", event);
	// TODO: Implement audit response logic
	// 1. Get queries from db.json for the time range
	// 2. Build Merkle tree
	// 3. Generate fairness proof
	// 4. Submit proof on-chain via sdk.proof.submitAuditProof()
});

console.log("✅ Contract event listeners initialized (watching for audits)");

app.get("/health", (c) => {
	return c.json({
		status: "ok",
		loadedModels: Array.from(models.keys()),
		timestamp: Date.now(),
	});
});

/**
 * Inference endpoint
 */
app.post("/predict", async (c) => {
	try {
		const body = await c.req.json();
		const { modelId, input, clientCommit, clientRand, queryId } = body as {
			modelId: string | number;
			input: unknown;
			clientCommit?: Hex;
			clientRand?: Hex;
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
		const session = models.get(String(modelId));
		if (!session) {
			return c.json({ error: `Model ${modelId} not found` }, 404);
		}

		// Prepare input tensor
		const inputTensor = new ort.Tensor(
			"float32",
			Float32Array.from(input as number[]),
			[1, (input as number[]).length],
		);

		// Run inference
		const results = await session.run({
			float_input: inputTensor, // Input name from your ONNX model
		});

		// Extract prediction (adjust based on your model's output)
		const outputTensor = results.label || results.output0;
		const prediction = outputTensor?.data[0] as number;

		// Build IT-MAC artifacts if client provided coin-flip inputs
		const now = Date.now();
		// Canonical input hash: encode float32 array via msgpack
		const asF32 = Array.from(new Float32Array(input as number[]));
		const inputHashBytes = Bun.sha(encode(asF32)) as Uint8Array;
		const inputHash =
			`0x${[...inputHashBytes].map((b) => b.toString(16).padStart(2, "0")).join("")}` as Hex;
		const qid = queryId ?? globalThis.crypto?.randomUUID?.() ?? `${now}`;
		let itmac:
			| {
					providerRand: Hex;
					coins: Hex;
					transcript: {
						queryId: string;
						modelId: number;
						inputHash: Hex;
						prediction: number;
						timestamp: number;
						coins: Hex;
					};
					bundle: { mac: Hex; providerSignature: Hex };
					providerPublicKey: Hex;
			  }
			| undefined;
		if (clientCommit && clientRand) {
			// Ensure clientRand matches commitment
			if (!verifyClientCommitment(clientCommit as Hex, clientRand as Hex)) {
				return c.json({ error: "Invalid commitment" }, 400);
			}
			const { flip, transcript, bundle } = makeItmacBundle({
				provider: itmacProvider,
				clientCommit: clientCommit as Hex,
				clientRand: clientRand as Hex,
				transcript: {
					queryId: qid,
					modelId: Number(modelId),
					inputHash,
					prediction: Number(prediction),
					timestamp: now,
				},
			});
			itmac = {
				providerRand: flip.providerRand,
				coins: flip.coins,
				transcript,
				bundle,
				providerPublicKey: providerKeys.publicKey,
			};
		}

		console.log(`🧠 Inference for model ${modelId}: ${prediction}`);

		// Persist minimal query data only (batches/Merkle later)
		const record: QueryLogRecord = {
			queryId: qid,
			modelId: Number(modelId),
			input: input as number[],
			prediction: Number(prediction),
			timestamp: now,
		};
		await appendRecord(record);

		return c.json({
			modelId,
			prediction: Number(prediction),
			timestamp: now,
			inputHash,
			queryId: qid,
			itmac,
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

app.get("/models", (c) => {
	return c.json({
		models: Array.from(models.keys()).map((id) => ({
			modelId: id,
		})),
	});
});

// No auditor endpoints for now; batches with Merkle will be added later

// Start server
const port = Number(process.env.PORT) || 5000;

console.log("🚀 Starting ONNX inference server...");

export default {
	port,
	fetch: app.fetch,
};

console.log(`✅ Server running on http://localhost:${port}`);
console.log(`📍 Inference: POST http://localhost:${port}/predict`);
console.log(`📍 Health: GET http://localhost:${port}/health`);
