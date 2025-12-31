#!/usr/bin/env bun

/**
 * Malicious Provider E2E Demo - Type B Fraud (Fraudulent Inclusion)
 *
 * This script demonstrates:
 * 1. Provider registers a model
 * 2. Provider serves a query and gives a signed receipt for RESULT A
 * 3. Provider commits a batch but includes RESULT B (Type B Fraud / Validity Fraud)
 * 4. User detects that the committed proof does not match their receipt
 * 5. User submits a disputeFraudulentInclusion
 * 6. Provider gets slashed
 */

import { SDK } from "@zkfair/sdk";
import { createMerkleProof } from "@zkfair/sdk/merkle";
import {
	createPublicClient,
	createWalletClient,
	encodePacked,
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

const sdk = new SDK({
	privateKey: PRIVATE_KEY,
});

const client = createPublicClient({
	chain: localhost,
	transport: http(RPC_URL),
});

async function main() {
	console.log(
		"Starting Malicious Provider E2E Demo (Type B - Fraudulent Inclusion)",
	);

	console.log("Registering Model...");

	const modelId = BigInt(Math.floor(Math.random() * 1000000));
	const weightsHash = keccak256(encodePacked(["uint256"], [modelId]));
	const datasetRoot = keccak256(encodePacked(["string"], ["dataset"]));

	try {
		const tx = await sdk.model.register(
			`Malicious Model B ${modelId}`,
			"A model that will lie about results",
			"https://malicious-inference-b.com",
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

		// Query User (What the user receives)
		const queryUser = {
			seqNum: BigInt(100),
			modelId: realModelId,
			features: [1, 2, 3],
			sensitiveAttr: BigInt(0),
			prediction: BigInt(1), // Truth is 1
			timestamp,
		};

		// Query Fake (What the provider commits to chain to cheat stats)
		const queryFake = {
			...queryUser,
			prediction: BigInt(0), // Lie: result is 0
		};

		const featuresHash = keccak256(
			encodePacked(["string"], [JSON.stringify(queryUser.features)]),
		);

		// leaf = keccak256(encodePacked(seqNum, modelId, featuresHash, sensitiveAttr, prediction, timestamp))

		const getLeaf = (q: typeof queryUser) =>
			keccak256(
				encodePacked(
					["uint256", "uint256", "bytes32", "uint256", "int256", "uint256"],
					[
						q.seqNum,
						q.modelId!,
						featuresHash,
						q.sensitiveAttr,
						q.prediction,
						q.timestamp,
					],
				),
			);

		const leafUser = getLeaf(queryUser); // user received this
		const leafFake = getLeaf(queryFake); // provider committed this (fabricated)

		console.log(`User holds receipt for Leaf: ${leafUser}`);
		console.log(`Provider planting Leaf: ${leafFake}`);

		// Committing the batch with the FAKE leaf
		// For simplicity, batch size 1
		const leaves = [leafFake.replace("0x", "")];
		const { root, proof } = await createMerkleProof(leaves, 0);
		// root is Hex

		console.log("Committing Fraudulent Batch...");

		const txBatch = await sdk.batch.commit(
			realModelId!,
			root,
			BigInt(1), // 1 query
			BigInt(100), // start
			BigInt(100), // end
		);
		console.log(`Fraudulent batch committed (tx: ${txBatch})`);
		await client.waitForTransactionReceipt({ hash: txBatch });

		// Retrieve batch ID
		const batches = await sdk.events.getBatchCommittedHistory();
		const myBatch = batches.find((b) => b.merkleRoot === root);
		if (!myBatch) throw new Error("Batch not found");
		console.log(`Batch ID: ${myBatch.batchId}`);

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

		// We act as the User. We see the batch root. We request the proof for position 0 from Provider (or data availability layer).
		// The provider (or DA) gives us the proof for the FAKE leaf because that's what is in the tree.
		// So we have the proof that proves `leafFake` is at index 0.
		// We submit OUR leaf (`leafUser`) and the proof for `leafFake`.
		// The contract computes root(leafUser, proof) != batchRoot.
		// Thus, slashing.

		const merkleProof = proof.map((p) => ("0x" + p.sibling) as Hex);
		const proofPositions = proof.map((p) => (p.position === "left" ? 0 : 1));

		const txDispute = await sdk.dispute.disputeFraudulentInclusion(
			myBatch.batchId!,
			queryUser.seqNum,
			leafUser,
			merkleProof,
			proofPositions,
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
