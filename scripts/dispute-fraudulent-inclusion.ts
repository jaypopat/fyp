#!/usr/bin/env bun

/**
 * Malicious Provider E2E Demo - Type B Fraud (Fraudulent Inclusion)
 *
 * This script demonstrates:
 * 1. Provider registers a model
 * 2. Provider serves a query and gives a signed receipt for RESULT A
 * 3. Provider commits a batch but includes RESULT B (Type B Fraud / Validity Fraud)
 * 4. User detects that the committed proof does not match their receipt
 * 5. User submits a disputeFraudulentInclusion with signed receipt
 * 6. Contract verifies provider signature and computes leafHash
 * 7. Provider gets slashed for lying about committed data
 */

import { SDK } from "@zkfair/sdk";
import { hashRecordLeaf } from "@zkfair/sdk/hash";
import { createMerkleProof } from "@zkfair/sdk/merkle";
import {
	createPublicClient,
	encodePacked,
	type Hex,
	http,
	keccak256,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { localhost } from "viem/chains";

const ATTESTATION_URL = process.env.ATTESTATION_URL || "http://localhost:3000";

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
		if (realModelId == null) throw new Error("Model ID is null");
		console.log(`Model ID: ${realModelId}`);

		console.log("Creating Signed Receipt...");

		const timestamp = BigInt(Math.floor(Date.now() / 1000)) - 3601n; // Mock 1 hour in the past to bypass grace period

		// Query User (What the user receives in signed receipt)
		const queryUser = {
			seqNum: BigInt(100),
			modelId: realModelId,
			features: [1, 2, 3],
			sensitiveAttr: BigInt(0),
			prediction: BigInt(1000000), // Truth is 1.0 (scaled by 1e6)
			timestamp,
		};

		// Provider signs the receipt for query User
		const featuresHash = keccak256(
			encodePacked(["string"], [JSON.stringify(queryUser.features)]),
		);

		const receiptDataHash = keccak256(
			encodePacked(
				["uint256", "uint256", "bytes32", "uint256", "int256", "uint256"],
				[
					queryUser.seqNum,
					realModelId,
					featuresHash,
					queryUser.sensitiveAttr,
					queryUser.prediction,
					queryUser.timestamp,
				],
			),
		);

		// Provider signs the receipt (user now has proof)
		const providerSignature = await account.signMessage({
			message: { raw: receiptDataHash },
		});
		console.log(`Provider signed receipt: ${receiptDataHash}`);

		// Query Fake (What the provider commits to chain to cheat stats)
		const queryFake = {
			...queryUser,
			prediction: BigInt(0), // Lie: result is 0 (different from signed receipt)
		};

		// Use Poseidon hash for fake leaf (matches circuit and batch tree)
		const leafFake = hashRecordLeaf({
			seqNum: Number(queryFake.seqNum),
			modelId: Number(realModelId),
			features: queryFake.features,
			sensitiveAttr: Number(queryFake.sensitiveAttr),
			prediction: Number(queryFake.prediction),
			timestamp: Number(queryFake.timestamp),
		});

		console.log(`Provider signed receipt for data: ${receiptDataHash}`);
		console.log(`Provider planted different data (Poseidon): ${leafFake}`);

		// Committing the batch with the FAKE leaf
		// For simplicity, batch size 1
		const leaves = [leafFake];
		const { root, proof } = await createMerkleProof(leaves, 0);

		console.log("Committing Fraudulent Batch...");

		const txBatch = await sdk.batch.commit(
			realModelId,
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
		if (myBatch.batchId == null) throw new Error("Batch ID is null");
		console.log(`Batch ID: ${myBatch.batchId}`);

		console.log("Launching Dispute with Signed Receipt...");

		console.log("Checking existing stake...");
		const providerStakeBefore = await getProviderStake(realModelId);
		console.log(`Provider Stake: ${providerStakeBefore}`);

		const disputePromise = new Promise((resolve) => {
			sdk.dispute.watchDisputeRaised((event: unknown) => {
				console.log("EVENT: DisputeRaised detected!");
				resolve(event);
			});
		});

		console.log("Requesting dispute attestation...");
		const attestationRes = await fetch(`${ATTESTATION_URL}/attest/dispute`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				batchId: myBatch.batchId.toString(),
				receipt: {
					seqNum: Number(queryUser.seqNum),
					modelId: Number(realModelId),
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
			const errData = await attestationRes.json().catch(() => null);
			throw new Error(
				`Attestation failed: ${errData?.error || attestationRes.statusText}`,
			);
		}

		const { attestationHash, signature: attestationSignature } =
			(await attestationRes.json()) as {
				attestationHash: Hex;
				signature: Hex;
			};

		console.log(`Attestation received: ${attestationHash}`);

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
		console.log(`Dispute submitted (tx: ${txDispute})`);

		await disputePromise;
		await client.waitForTransactionReceipt({ hash: txDispute });

		console.log("Verifying Justice...");

		const providerStakeAfter = await getProviderStake(realModelId);
		console.log(`Provider Stake after: ${providerStakeAfter}`);

		if (providerStakeAfter < providerStakeBefore) {
			console.log("SUCCESS: Provider was slashed!");
			console.log(
				"Provider signed receipt for one result but committed different data.",
			);
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
