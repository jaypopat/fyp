import type { AuditRequestedEvent } from "@zkfair/sdk";
import type { Hash } from "viem";
import { getQueriesBySequence } from "../db";
import { sdk } from "./sdk";

/**
 * Handle audit requests by building proofs and submitting signed attestations
 */
export async function handleAuditRequest(event: AuditRequestedEvent) {
	console.log("Audit ID:", event.auditId.toString());
	console.log("Batch ID:", event.batchId.toString());

	try {
		// 1. Get batch info from contract
		const batch = await sdk.batch.get(event.batchId);
		const startSeq = Number(batch.seqNumStart);
		const endSeq = Number(batch.seqNumEnd);
		const modelId = batch.modelId;

		console.log(
			`Batch covers seqNum ${startSeq} to ${endSeq}, modelId: ${modelId}`,
		);

		// 2. Get model's weightsHash (needed to find artifacts)
		const model = await sdk.model.getById(modelId);
		const weightsHash = model.weightsHash as Hash;
		console.log(`Model weightsHash: ${weightsHash}`);

		// 3. Load records from database by sequence range
		const records = await getQueriesBySequence(startSeq, endSeq);

		if (records.length === 0) {
			throw new Error(`No records found for seq range ${startSeq}-${endSeq}`);
		}

		console.log(`Loaded ${records.length} records from database`);

		// 4. Convert to AuditRecord format for SDK
		const auditRecords = records.map((r) => ({
			seqNum: r.seq,
			modelId: r.modelId,
			features: r.features,
			sensitiveAttr: r.sensitiveAttr,
			prediction: r.prediction,
			timestamp: r.timestamp,
		}));

		// 5. Build Merkle tree for the batch
		const { root } = await sdk.audit.buildBatch(auditRecords);
		console.log(`Built Merkle tree with root ${root}`);

		// 6. Convert sample indices and generate merkle proofs
		const sampleIndices = event.sampleIndices.map((idx: bigint) => Number(idx));
		const merkleProofs = await Promise.all(
			sampleIndices.map(async (index: number) => {
				const record = auditRecords[index];
				if (!record) {
					throw new Error(`No record found at index ${index}`);
				}
				return sdk.audit.createProof(auditRecords, record.seqNum);
			}),
		);
		console.log(`Generated ${merkleProofs.length} Merkle proofs`);

		// 7. Generate ZK proof and get attestation (SDK handles attestation service call)
		console.log("Generating ZK proof and requesting attestation...");
		const { attestationHash, signature, passed } =
			await sdk.audit.generateFairnessZKProof(
				root,
				sampleIndices,
				auditRecords,
				merkleProofs,
				weightsHash,
				event.auditId,
			);

		console.log(`Attestation received: passed=${passed}`);

		// 8. Submit signed attestation to contract
		console.log("Submitting attestation to contract...");
		const txHash = await sdk.audit.submitAuditProof(
			event.auditId,
			attestationHash,
			signature,
			passed,
		);

		console.log("Tx hash:", txHash);
		console.log("Result:", passed ? "PASSED" : "FAILED");
	} catch (error) {
		console.error("Error:", error);
	}
}
