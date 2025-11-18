import type { AuditRequestedEvent } from "@zkfair/sdk";
import { getQueries } from "../db";
import { toAuditRecord } from "./batch.service";
import { sdk } from "./sdk";

/**
 * Handle audit requests by building proofs and submitting signed attestations
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

		// Convert to AuditRecord format for SDK
		const auditRecords = records.map(toAuditRecord);

		// Build Merkle tree for the batch
		const { root } = await sdk.audit.buildBatch(auditRecords);
		console.log(`Built Merkle tree with root ${root}`);

		// Generate merkle proofs for each sample index
		const merkleProofs = await Promise.all(
			sampleIndices.map(async (index) => {
				const record = auditRecords[index];
				if (!record) {
					throw new Error(`No record found at index ${index}`);
				}
				return sdk.audit.createProof(auditRecords, record.queryId);
			}),
		);
		console.log(`Generated ${merkleProofs.length} Merkle proofs`);

		// Generate ZK proof and obtain attestation from SDK (which talks to the attestation service)
		const { attestationHash, signature, passed } =
			await sdk.audit.generateFairnessZKProof(
				root,
				sampleIndices,
				auditRecords,
				merkleProofs,
			);

		console.log(
			`Attestation received from SDK: passed=${passed}, hash=${attestationHash}`,
		);

		// Submit signed attestation to contract
		console.log("Submitting attestation to contract...");
		const txHash = await sdk.audit.submitAuditProof(
			event.auditId,
			attestationHash,
			signature,
			passed,
		);
		console.log("Submitted audit attestation, tx hash:", txHash);
	} catch (error) {
		console.error("Audit response failed:", error);
	}
}
