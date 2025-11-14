import type { AuditRequestedEvent } from "@zkfair/sdk";
import { getQueries } from "../db";
import { toAuditRecord } from "./batch.service";
import { sdk } from "./sdk";

/**
 * Handle audit requests by building proofs and submitting to contract
 */
export async function handleAuditRequest(event: AuditRequestedEvent) {
	console.log("Audit requested:", event);
	try {
		const batchId = Number(event.batchId);
		const batchSize = Number(process.env.BATCH_SIZE || 100);
		const sampleIndices = event.sampleIndices.map((idx) => Number(idx));

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

		// 4: now we generate merkle proofs for each index
		const merkleProofs = await Promise.all(
			sampleIndices.map(async (index) => {
				const record = auditRecords[index];
				if (!record) {
					throw new Error(`No record found at index ${index}`);
				}
				return sdk.audit.createProof(auditRecords, record.queryId);
			}),
		);
		console.log("merkle proofs", merkleProofs, merkleProofs.length);

		const { zkProof, publicInputs } = await sdk.audit.generateFairnessZKProof(
			root,
			sampleIndices,
			auditRecords,
			merkleProofs,
		);

		console.log("Submitting proof to contract...");
		const txHash = await sdk.audit.submitAuditProof(
			event.auditId,
			zkProof as `0x${string}`,
			publicInputs as `0x${string}`[],
		);
		console.log("Submitted audit proof, tx hash:", txHash);
	} catch (error) {
		console.error("Audit response failed:", error);
	}
}
