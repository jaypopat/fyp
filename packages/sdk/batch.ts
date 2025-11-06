import type { ContractClient } from "./contract";

/**
 * Batch API - Query batch commitments from blockchain
 * Browser-safe API for reading batch data
 */
export class BatchAPI {
	constructor(private contracts: ContractClient) {}

	/**
	 * Get batch details by ID
	 */
	async get(batchId: bigint) {
		return this.contracts.getBatch(batchId);
	}

	/**
	 * Get batch IDs for a specific model
	 */
	async getIdsByModel(modelId: bigint) {
		return this.contracts.getBatchesByModel(modelId);
	}

	/**
	 * Get all batches for a specific model
	 */
	async getByModel(modelId: bigint) {
		const batchIds = await this.contracts.getBatchesByModel(modelId);
		return Promise.all(batchIds.map((id) => this.contracts.getBatch(id)));
	}

	/**
	 * Get total number of batches across all models
	 */
	async getTotal() {
		return this.contracts.getTotalBatches();
	}

	/**
	 * Request audit on a batch (challenge)
	 */
	async requestAudit(batchId: bigint) {
		return this.contracts.requestAudit(batchId);
	}

	/**
	 * Get audit details
	 */
	async getAudit(auditId: bigint) {
		return this.contracts.getAudit(auditId);
	}
}
