#!/usr/bin/env bun

/**
 * Malicious Provider E2E Demo
 *
 * This script demonstrates the full lifecycle of a dispute:
 * 1. Provider registers a model
 * 2. Provider serves a query and gives a signed receipt
 * 3. Provider commits a batch but OMITS that query (Type A Fraud)
 * 4. User detects the omission
 * 5. User submits a dispute
 * 6. Provider gets slashed
 */

import { SDK } from "@zkfair/sdk";
import {
	createPublicClient,
	createWalletClient,
	encodePacked,
	type Hex,
	http,
	keccak256,
	parseEther,
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

const sdk = new SDK({
	privateKey: PRIVATE_KEY,
});

const client = createPublicClient({
	chain: localhost,
	transport: http(RPC_URL),
});

async function main() {
	console.log("Starting Malicious Provider E2E Demo");

	console.log("Registering Model...");

	const modelId = BigInt(Math.floor(Math.random() * 1000000));
	const weightsHash = keccak256(encodePacked(["uint256"], [modelId]));
	const datasetRoot = keccak256(encodePacked(["string"], ["dataset"]));

	try {
		const tx = await sdk.model.register(
			`Malicious Model ${modelId}`,
			"A model that will cheat",
			"https://malicious-inference.com",
			weightsHash,
			datasetRoot,
			10, // fairness threshold
		);
		console.log(`Model registered (tx: ${tx})`);

		await client.waitForTransactionReceipt({ hash: tx });

		const logs = await sdk.events.getModelRegisteredHistory();
		const myLog = logs.find((l) => l.weightsHash === weightsHash);
		if (!myLog) throw new Error("Could not find model registration log");
		const realModelId = myLog.modelId;
		console.log(`Model ID: ${realModelId}`);

		console.log("Serving Queries (Creating Trap)...");

		const timestamp = BigInt(Math.floor(Date.now() / 1000)) - 3601n; // Mock 1 hour in the past to bypass grace period

		// Query A: Included in batch
		const queryA = {
			seqNum: BigInt(100),
			modelId: realModelId,
			features: [1, 2, 3],
			sensitiveAttr: BigInt(0),
			prediction: BigInt(1),
			timestamp,
		};

		// Query B: OMITTED from batch (The Victim)
		const queryB = {
			seqNum: BigInt(101),
			modelId: realModelId,
			features: [4, 5, 6],
			sensitiveAttr: BigInt(1),
			prediction: BigInt(0),
			timestamp,
		};

		const featuresHashA = keccak256(
			encodePacked(["string"], [JSON.stringify(queryA.features)]),
		);
		const featuresHashB = keccak256(
			encodePacked(["string"], [JSON.stringify(queryB.features)]),
		);

		// Sign Query B (The one we'll dispute)
		const dataHashB = keccak256(
			encodePacked(
				["uint256", "uint256", "bytes32", "uint256", "int256", "uint256"],
				[
					queryB.seqNum,
					queryB.modelId!,
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
		console.log(`Signed receipt for Query B (seqNum ${queryB.seqNum})`);

		console.log("Committing Fraudulent Batch...");

		const leafA = keccak256(
			encodePacked(
				["uint256", "uint256", "bytes32", "uint256", "int256", "uint256"],
				[
					queryA.seqNum,
					queryA.modelId!,
					featuresHashA,
					queryA.sensitiveAttr,
					queryA.prediction,
					queryA.timestamp,
				],
			),
		);

		// Merkle root is just leaf A (simplified tree for demo)
		const merkleRoot = leafA;

		// Commit batch claiming to cover ONLY seqNum 100
		// Sequence 101 is completely omitted (Type A Fraud)

		const txBatch = await sdk.batch.commit(
			realModelId!,
			merkleRoot,
			BigInt(1), // claiming 1 query
			BigInt(100), // start
			BigInt(100), // end
		);
		console.log(`Fraudulent batch committed (tx: ${txBatch})`);
		await client.waitForTransactionReceipt({ hash: txBatch });

		console.log("Launching Dispute...");

		console.log("Checking existing stake...");
		const providerStakeBefore = await getProviderStake(realModelId!);
		console.log(`Provider Stake: ${providerStakeBefore}`);

		const disputePromise = new Promise((resolve) => {
			sdk.dispute.watchDisputeRaised((event: any) => {
				console.log("EVENT: DisputeRaised detected!");
				resolve(event);
			});
		});

		const txDispute = await sdk.dispute.disputeNonInclusion(
			realModelId!,
			queryB.seqNum,
			queryB.timestamp,
			featuresHashB,
			queryB.sensitiveAttr,
			queryB.prediction,
			signatureB,
		);
		console.log(`Dispute submitted (tx: ${txDispute})`);

		await disputePromise;
		await client.waitForTransactionReceipt({ hash: txDispute });

		console.log("Verifying Justice...");

		const providerStakeAfter = await getProviderStake(realModelId!);
		console.log(`Provider Stake after: ${providerStakeAfter}`);

		if (providerStakeAfter < providerStakeBefore) {
			console.log("SUCCESS: Provider was slashed!");
		} else {
			console.error("FAILURE: Provider stake did not decrease.");
			process.exit(1);
		}
	} catch (error) {
		console.error("DEMO FAILED:", error);
		process.exit(1);
	}
}

async function getProviderStake(modelId: bigint) {
	const model = await sdk.model.getById(modelId);
	return model.stake;
}

main().then(() => process.exit(0));
