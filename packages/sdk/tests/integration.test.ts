/**
 * SDK Integration Tests
 *
 * Fully self-contained: spawns anvil, deploys the contract,
 * starts the attestation service, runs tests, tears down.
 *
 * Run: bun test tests/integration.test.ts
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { resolve } from "node:path";
import {
	createPublicClient,
	encodePacked,
	type Hex,
	http,
	keccak256,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { localhost } from "viem/chains";
import { hashRecordLeaf } from "../hash";
import { createMerkleProof } from "../merkle";
import { SDK } from "../sdk";

const PRIVATE_KEY =
	"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;
const ATTESTATION_KEY =
	"0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6";
const ATTESTATION_URL = "http://localhost:3000";
const CONTRACTS_DIR = resolve(import.meta.dir, "../../../packages/contracts");
const ATTESTATION_DIR = resolve(import.meta.dir, "../../../apps/attestation");

const account = privateKeyToAccount(PRIVATE_KEY);
let sdk: SDK;
let client: ReturnType<typeof createPublicClient>;
let anvilProcess: ReturnType<typeof Bun.spawn> | null = null;
let attestationProcess: ReturnType<typeof Bun.spawn> | null = null;

async function waitForService(url: string, timeoutMs = 15_000) {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		try {
			const res = await fetch(url);
			if (res.ok) return;
		} catch {
			// not ready yet
		}
		await Bun.sleep(250);
	}
	throw new Error(`Service at ${url} did not start in time`);
}

beforeAll(async () => {
	// 1. Start anvil
	anvilProcess = Bun.spawn(["anvil", "--silent"], {
		stdout: "ignore",
		stderr: "ignore",
	});

	await waitForService("http://localhost:8545").catch(() => {
		// Retry with JSON-RPC for anvil (it doesn't serve GET)
	});
	// Anvil needs JSON-RPC check
	const anvilStart = Date.now();
	while (Date.now() - anvilStart < 10_000) {
		try {
			const res = await fetch("http://localhost:8545", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					method: "eth_chainId",
					params: [],
					id: 1,
				}),
			});
			if (res.ok) break;
		} catch {
			await Bun.sleep(200);
		}
	}

	// 2. Deploy contract
	const deploy = Bun.spawnSync(
		[
			"forge",
			"script",
			"script/DeployAndSeed.s.sol:DeployAndSeed",
			"--rpc-url",
			"http://localhost:8545",
			"--broadcast",
			"--private-key",
			PRIVATE_KEY,
		],
		{ cwd: CONTRACTS_DIR, stdout: "pipe", stderr: "pipe" },
	);

	if (deploy.exitCode !== 0) {
		throw new Error(`Contract deploy failed:\n${deploy.stderr.toString()}`);
	}

	// 3. Sync contract address to SDK config
	const sync = Bun.spawnSync(["bun", "run", "sync-address", "local"], {
		cwd: CONTRACTS_DIR,
		stdout: "pipe",
		stderr: "pipe",
	});

	if (sync.exitCode !== 0) {
		throw new Error(`Address sync failed:\n${sync.stderr.toString()}`);
	}

	// 4. Start attestation service
	attestationProcess = Bun.spawn(["bun", "run", "index.ts"], {
		cwd: ATTESTATION_DIR,
		stdout: "ignore",
		stderr: "ignore",
		env: {
			...process.env,
			ATTESTATION_SERVICE_PRIVATE_KEY: ATTESTATION_KEY,
		},
	});

	await waitForService(`${ATTESTATION_URL}/health`);

	// 5. Initialize SDK + client
	client = createPublicClient({
		chain: localhost,
		transport: http("http://localhost:8545"),
	});

	sdk = new SDK({ privateKey: PRIVATE_KEY });
}, 60_000);

afterAll(() => {
	if (attestationProcess) {
		attestationProcess.kill();
		attestationProcess = null;
	}
	if (anvilProcess) {
		anvilProcess.kill();
		anvilProcess = null;
	}
});

async function registerModel() {
	const seed = BigInt(Math.floor(Math.random() * 1_000_000));
	const weightsHash = keccak256(encodePacked(["uint256"], [seed]));
	const datasetRoot = keccak256(encodePacked(["string"], ["test_dataset"]));

	const tx = await sdk.model.register(
		`Test Model ${seed}`,
		"Integration test model",
		"https://test.local/predict",
		weightsHash,
		datasetRoot,
		10,
	);
	await client.waitForTransactionReceipt({ hash: tx });

	const logs = await sdk.events.getModelRegisteredHistory();
	const log = logs.find((l) => l.weightsHash === weightsHash);
	if (!log) throw new Error("Model registration log not found");
	if (log.modelId === undefined) throw new Error("Model ID missing from event");

	return { modelId: log.modelId, weightsHash };
}

describe("Protocol Integration Tests", () => {
	describe("Model Registration", () => {
		it("should register a model and read it back", async () => {
			const { modelId } = await registerModel();

			const model = await sdk.model.getById(modelId);
			expect(model.provider.toLowerCase()).toBe(account.address.toLowerCase());
			expect(model.stake).toBeGreaterThan(0n);
		}, 30_000);
	});

	describe("Batch Commitment", () => {
		it("should commit a batch and verify on-chain", async () => {
			const { modelId } = await registerModel();

			const merkleRoot = keccak256(encodePacked(["string"], ["test_batch"]));
			const tx = await sdk.batch.commit(modelId, merkleRoot, 10n, 1n, 10n);
			await client.waitForTransactionReceipt({ hash: tx });

			const batchIds = await sdk.batch.getIdsByModel(modelId);
			expect(batchIds.length).toBe(1);
			const batchId = batchIds[0];
			if (batchId === undefined) throw new Error("No batch ID returned");

			const batch = await sdk.batch.get(batchId);
			expect(batch.merkleRoot).toBe(merkleRoot);
			expect(batch.queryCount).toBe(10n);
		}, 30_000);
	});

	describe("Type A Dispute — Non-Inclusion", () => {
		it("should slash provider when query is omitted from batch", async () => {
			const { modelId } = await registerModel();

			const timestamp = BigInt(Math.floor(Date.now() / 1000)) - 3601n;

			const queryA = {
				seqNum: 100n,
				modelId,
				features: [1, 2, 3],
				sensitiveAttr: 0n,
				prediction: 1n,
				timestamp,
			};

			const queryB = {
				seqNum: 101n,
				modelId,
				features: [4, 5, 6],
				sensitiveAttr: 1n,
				prediction: 0n,
				timestamp,
			};

			const featuresHashA = keccak256(
				encodePacked(["string"], [JSON.stringify(queryA.features)]),
			);
			const featuresHashB = keccak256(
				encodePacked(["string"], [JSON.stringify(queryB.features)]),
			);

			// Provider signs receipt for query B
			const dataHashB = keccak256(
				encodePacked(
					["uint256", "uint256", "bytes32", "uint256", "int256", "uint256"],
					[
						queryB.seqNum,
						modelId,
						featuresHashB,
						queryB.sensitiveAttr,
						queryB.prediction,
						queryB.timestamp,
					],
				),
			);
			const signatureB = await account.signMessage({
				message: { raw: dataHashB },
			});

			// Commit batch with only query A (omitting B)
			const leafA = keccak256(
				encodePacked(
					["uint256", "uint256", "bytes32", "uint256", "int256", "uint256"],
					[
						queryA.seqNum,
						modelId,
						featuresHashA,
						queryA.sensitiveAttr,
						queryA.prediction,
						queryA.timestamp,
					],
				),
			);

			const txBatch = await sdk.batch.commit(modelId, leafA, 1n, 100n, 100n);
			await client.waitForTransactionReceipt({ hash: txBatch });

			const modelBefore = await sdk.model.getById(modelId);
			expect(modelBefore.stake).toBeGreaterThan(0n);

			// Dispute non-inclusion of query B
			const txDispute = await sdk.dispute.disputeNonInclusion(
				modelId,
				queryB.seqNum,
				queryB.timestamp,
				featuresHashB,
				queryB.sensitiveAttr,
				queryB.prediction,
				signatureB,
			);
			await client.waitForTransactionReceipt({ hash: txDispute });

			const modelAfter = await sdk.model.getById(modelId);
			expect(modelAfter.stake).toBe(0n);
		}, 60_000);
	});

	describe("Type B Dispute — Fraudulent Inclusion", () => {
		it("should slash provider when batch data doesn't match receipt", async () => {
			const { modelId } = await registerModel();

			const timestamp = BigInt(Math.floor(Date.now() / 1000)) - 3601n;

			const queryUser = {
				seqNum: 100n,
				modelId,
				features: [1, 2, 3],
				sensitiveAttr: 0n,
				prediction: 1_000_000n,
				timestamp,
			};

			const featuresHash = keccak256(
				encodePacked(["string"], [JSON.stringify(queryUser.features)]),
			);

			const receiptDataHash = keccak256(
				encodePacked(
					["uint256", "uint256", "bytes32", "uint256", "int256", "uint256"],
					[
						queryUser.seqNum,
						modelId,
						featuresHash,
						queryUser.sensitiveAttr,
						queryUser.prediction,
						queryUser.timestamp,
					],
				),
			);
			const providerSignature = await account.signMessage({
				message: { raw: receiptDataHash },
			});

			// Commit FAKE data (prediction = 0)
			const queryFake = { ...queryUser, prediction: 0n };
			const leafFake = hashRecordLeaf({
				seqNum: Number(queryFake.seqNum),
				modelId: Number(modelId),
				features: queryFake.features,
				sensitiveAttr: Number(queryFake.sensitiveAttr),
				prediction: Number(queryFake.prediction),
				timestamp: Number(queryFake.timestamp),
			});

			const { root, proof } = await createMerkleProof([leafFake], 0);

			const txBatch = await sdk.batch.commit(modelId, root, 1n, 100n, 100n);
			await client.waitForTransactionReceipt({ hash: txBatch });

			const batches = await sdk.events.getBatchCommittedHistory();
			const myBatch = batches.find((b) => b.merkleRoot === root);
			if (!myBatch) throw new Error("Batch not found");

			// Request attestation from service
			const attestationRes = await fetch(`${ATTESTATION_URL}/attest/dispute`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					batchId: myBatch.batchId?.toString(),
					receipt: {
						seqNum: Number(queryUser.seqNum),
						modelId: Number(modelId),
						features: queryUser.features,
						sensitiveAttr: Number(queryUser.sensitiveAttr),
						prediction: Number(queryUser.prediction),
						timestamp: Number(queryUser.timestamp),
					},
					featuresHash,
					providerSignature,
					merkleProof: proof,
				}),
			});

			if (!attestationRes.ok) {
				const err = await attestationRes.json().catch(() => null);
				throw new Error(
					`Attestation failed: ${(err as Record<string, unknown>)?.error || attestationRes.statusText}`,
				);
			}

			const { attestationHash, signature: attestationSignature } =
				(await attestationRes.json()) as {
					attestationHash: Hex;
					signature: Hex;
				};

			const modelBefore = await sdk.model.getById(modelId);
			expect(modelBefore.stake).toBeGreaterThan(0n);

			if (!myBatch.batchId) throw new Error("Batch ID not found");
			const txDispute = await sdk.dispute.disputeFraudulentInclusion(
				myBatch.batchId,
				queryUser.seqNum,
				queryUser.timestamp,
				featuresHash,
				queryUser.sensitiveAttr,
				queryUser.prediction,
				providerSignature,
				attestationHash,
				attestationSignature,
			);
			await client.waitForTransactionReceipt({ hash: txDispute });

			const modelAfter = await sdk.model.getById(modelId);
			expect(modelAfter.stake).toBe(0n);
		}, 60_000);
	});
});
