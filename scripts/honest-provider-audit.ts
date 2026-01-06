#!/usr/bin/env bun

/**
 * Honest Provider Audit E2E Demo
 *
 * This script demonstrates the full lifecycle of a SUCCESSFUL audit:
 * 1. Provider registers a model
 * 2. Provider serves queries and logs them to localized DB
 * 3. Provider commits a batch covering those queries
 * 4. Challenger (or random sampler) requests an audit
 * 5. Provider listens to event, generates proof, and submits attestation
 * 6. Audit passes on-chain
 */

import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { SDK } from "@zkfair/sdk";
import { zkfairQueryLogs, zkfairSchema } from "@zkfair/sdk/schema";
import { getArtifactDir, hashPoseidonFields } from "@zkfair/sdk/utils";
import { drizzle } from "drizzle-orm/bun-sqlite";
import {
	createPublicClient,
	encodePacked,
	type Hash,
	type Hex,
	http,
	keccak256,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { localhost } from "viem/chains";

const RPC_URL = "http://localhost:8545";
const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;

if (!PRIVATE_KEY) {
	throw new Error("PRIVATE_KEY is required");
}

const account = privateKeyToAccount(PRIVATE_KEY);
console.log(`Using account: ${account.address}`);

/**
 * Setup mock artifacts on disk so the SDK can find them during proof generation.
 */
async function setupMockArtifacts(weightsHash: Hash) {
	const dir = getArtifactDir(weightsHash);
	await mkdir(dir, { recursive: true });

	// 15 weights as required by NUM_WEIGHTS in circuit
	const weights = new Float32Array(15).fill(0);
	const weightsPath = path.join(dir, "weights.bin");
	await Bun.write(weightsPath, weights.buffer);

	const fairnessPath = path.join(dir, "fairness.json");
	const fairnessConfig = {
		metric: "demographic_parity",
		protectedAttribute: "sex",
		protectedAttributeIndex: 0,
		targetDisparity: 0.1,
		thresholds: {
			group_a: 50, // scaled by 100 in circuit
			group_b: 50,
		},
	};
	await Bun.write(fairnessPath, JSON.stringify(fairnessConfig));

	const pathsPath = path.join(dir, "paths.json");
	await Bun.write(
		pathsPath,
		JSON.stringify({
			weights: weightsPath,
			fairnessThreshold: fairnessPath,
			dataset: "mock_dataset.csv",
		}),
	);

	console.log(`Mock artifacts set up in ${dir}`);
}

// --- Stub DB Setup ---
const sqlite = new Database(":memory:");
const db = drizzle(sqlite, { schema: zkfairSchema });

sqlite.run(`
    CREATE TABLE IF NOT EXISTS zkfair_query_logs (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        model_id INTEGER NOT NULL,
        features TEXT NOT NULL,         -- JSON string array
        sensitive_attr INTEGER NOT NULL,
        prediction REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        batch_id TEXT
    );
`);

sqlite.run(`
    CREATE TABLE IF NOT EXISTS zkfair_batches (
        id TEXT PRIMARY KEY,
        start_seq INTEGER NOT NULL,
        end_seq INTEGER NOT NULL,
        merkle_root TEXT NOT NULL,
        record_count INTEGER NOT NULL,
        tx_hash TEXT,
        created_at INTEGER NOT NULL,
        committed_at INTEGER
    );
`);

const sdk = new SDK({
	privateKey: PRIVATE_KEY,
});

const client = createPublicClient({
	chain: localhost,
	transport: http(RPC_URL),
});

async function main() {
	console.log("Starting Honest Provider Audit E2E Demo");

	// 1. Register Model
	console.log("Registering Model...");
	const modelSeed = BigInt(Math.floor(Math.random() * 1000000));
	const dummyWeights = new Array(15).fill(0n);
	const weightsHash = `0x${hashPoseidonFields(dummyWeights)}` as Hash;
	const datasetRoot = keccak256(encodePacked(["string"], ["dataset"]));

	const tx = await sdk.model.register(
		`Honest Model ${modelSeed}`,
		"A completely fair model",
		"https://honest-inference.com",
		weightsHash,
		datasetRoot,
		10, // fairness threshold (10%)
	);
	console.log(`Model registered (tx: ${tx})`);
	await client.waitForTransactionReceipt({ hash: tx });

	// Setup artifacts so proof generation works
	await setupMockArtifacts(weightsHash);

	// Get Real Model ID
	const logs = await sdk.events.getModelRegisteredHistory();
	const myLog = logs.find((l) => l.weightsHash === weightsHash);
	if (!myLog) throw new Error("Could not find model registration log");
	const realModelId = myLog.modelId;
	console.log(`Model ID: ${realModelId}`);

	// 2. Simulate Serving Queries & Logging to DB
	console.log("Serving 50 Queries...");
	const timestamp = BigInt(Math.floor(Date.now() / 1000));
	const queries = [];

	for (let i = 0; i < 50; i++) {
		const seq = i + 1;
		const sensitiveAttr = i % 2; // Split 50/50 between groups
		const prediction = i % 3 === 0 ? 1 : 0; // Deterministic predictions

		// Insert into DB
		await db.insert(zkfairQueryLogs).values({
			seq,
			modelId: Number(realModelId),
			features: Array(14)
				.fill(0)
				.map((_, idx) => idx + i), // Dummy features
			sensitiveAttr,
			prediction,
			timestamp: Number(timestamp),
		});

		queries.push({ seq, sensitiveAttr, prediction });
	}
	console.log("Queries logged to local database.");

	// 3. Commit Batch
	console.log("Committing Batch...");
	const auditRecords = queries.map((q) => ({
		seqNum: q.seq,
		modelId: Number(realModelId),
		features: Array(14)
			.fill(0)
			.map((_, idx) => idx + q.seq),
		sensitiveAttr: q.sensitiveAttr,
		prediction: q.prediction,
		timestamp: Number(timestamp),
	}));

	const { root, count } = await sdk.audit.buildBatch(auditRecords);
	console.log(`Batch Root: ${root}`);

	const txBatch = await sdk.batch.commit(
		realModelId!,
		root,
		BigInt(count),
		BigInt(1), // start seq
		BigInt(50), // end seq
	);
	console.log(`Batch committed (tx: ${txBatch})`);
	await client.waitForTransactionReceipt({ hash: txBatch });

	// Get Batch ID
	const batchLogs = await sdk.events.getBatchCommittedHistory();
	const myBatchLog = batchLogs.find((b) => b.merkleRoot === root);
	if (!myBatchLog) throw new Error("Batch log not found");
	const batchId = myBatchLog.batchId!;
	console.log(`Batch ID: ${batchId}`);

	// 4. Request Audit (Simulating a challenger/user)
	console.log("Requesting Audit on Batch...");

	// Listen for the event first so we don't miss it (race condition safety)
	const auditRequestPromise = new Promise((resolve) => {
		sdk.events.watchAuditRequested(async (event) => {
			// 5. Provider handles the audit request
			if (event.batchId === batchId) {
				console.log(
					`\n>>> EVENT RECEIVED: Audit Requested for Batch ${event.batchId}`,
				);
				console.log(`Samples requested: ${event.sampleIndices.join(", ")}`);

				try {
					const result = await sdk.audit.handleAuditRequest(event, db);
					resolve(result);
				} catch (e) {
					console.error("Error handling audit request:", e);
					process.exit(1);
				}
			}
		});
	});

	const txAudit = await sdk.audit.requestAudit(batchId);
	console.log(`Audit requested (tx: ${txAudit})`);
	await client.waitForTransactionReceipt({ hash: txAudit });

	console.log(
		"Waiting for provider to generate proof and submit attestation...",
	);
	const result = (await auditRequestPromise) as {
		txHash: Hex;
		passed: boolean;
	};

	// 6. Verify Result
	if (result.passed) {
		console.log("\nSUCCESS: Audit passed and proof submitted!");
		console.log(`Tx Hash: ${result.txHash}`);
	} else {
		console.error("\nFAILURE: Audit failed or passed=false returned.");
		process.exit(1);
	}
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
