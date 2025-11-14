import { zkFairAbi } from "@zkfair/contracts/abi";
import {
	type Address,
	type Chain,
	createPublicClient,
	createWalletClient,
	type Hash,
	http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil, sepolia } from "viem/chains";
import type {
	AuditExpiredEvent,
	AuditProofSubmittedEvent,
	AuditRequestedEvent,
	BatchCommittedEvent,
	ModelCertifiedEvent,
	ModelRegisteredEvent,
	ProviderSlashedEvent,
	StakeWithdrawnEvent,
} from "./events";
import type { ZkFairOptions } from "./types";

export class ContractClient {
	private contractAddress: Address;
	private publicClient;
	private walletClient?;
	private chain: Chain;

	constructor(options: ZkFairOptions) {
		this.contractAddress = options?.contractAddress as Address;
		this.chain = options.rpcUrl?.includes("localhost") ? anvil : sepolia;

		this.publicClient = createPublicClient({
			chain: this.chain,
			transport: http(options.rpcUrl ?? "http://localhost:8545"),
		});

		if (options?.privateKey) {
			const account = privateKeyToAccount(options?.privateKey as Hash);
			this.walletClient = createWalletClient({
				account,
				chain: this.chain,
				transport: http(options.rpcUrl),
			});
		}
	}

	// ============================================
	// PHASE 1: MODEL REGISTRATION & CERTIFICATION
	// ============================================

	/**
	 * Register a new ML model with required stake
	 * @param name Model name
	 * @param weightsHash Hash of model weights
	 * @param datasetMerkleRoot Merkle root of calibration dataset
	 * @param fairnessThreshold Maximum fairness disparity (0-100)
	 * @returns Transaction hash
	 */
	async registerModel(
		name: string,
		description: string,
		weightsHash: Hash,
		datasetMerkleRoot: Hash,
		fairnessThreshold: number,
	) {
		if (!this.walletClient)
			throw new Error("Wallet client required for write operations");

		// Get required stake from contract
		const stake = await this.publicClient.readContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "PROVIDER_STAKE",
		});

		return await this.walletClient.writeContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "registerModel",
			account: this.walletClient.account,
			args: [
				name,
				description,
				weightsHash,
				datasetMerkleRoot,
				BigInt(fairnessThreshold),
			],
			value: stake as bigint,
		});
	}

	/**
	 * Submit certification proof for a registered model
	 * @param weightsHash: Weights Hash (model id)
	 * @param proof ZK proof bytes
	 * @param publicInputs Public inputs for verification
	 * @returns Transaction hash
	 */
	async submitCertificationProof(
		weightsHash: Hash,
		proof: Hash,
		publicInputs: Hash[],
	) {
		if (!this.walletClient)
			throw new Error("Wallet client required for write operations");

		return await this.walletClient.writeContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "submitCertificationProof",
			account: this.walletClient.account,
			args: [weightsHash, proof, publicInputs],
		});
	}

	// ============================================
	// PHASE 2: BATCH COMMITMENT
	// ============================================

	/**
	 * Commit a batch of queries
	 * @param modelId Model ID used for queries
	 * @param merkleRoot Merkle root of query-output pairs
	 * @param queryCount Number of queries in batch
	 * @param timestampStart Start timestamp
	 * @param timestampEnd End timestamp
	 * @returns Transaction hash
	 */
	async commitBatch(
		modelId: bigint,
		merkleRoot: Hash,
		queryCount: bigint,
		timestampStart: bigint,
		timestampEnd: bigint,
	) {
		if (!this.walletClient)
			throw new Error("Wallet client required for write operations");

		return await this.walletClient.writeContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "commitBatch",
			account: this.walletClient.account,
			args: [modelId, merkleRoot, queryCount, timestampStart, timestampEnd],
		});
	}

	// ============================================
	// PHASE 3: AUDITING
	// ============================================

	/**
	 * Request audit on a committed batch
	 * @param batchId Batch ID to audit
	 * @returns Transaction hash
	 */
	async requestAudit(batchId: bigint) {
		if (!this.walletClient)
			throw new Error("Wallet client required for write operations");

		return await this.walletClient.writeContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "requestAudit",
			account: this.walletClient.account,
			args: [batchId],
		});
	}

	/**
	 * Submit audit proof in response to challenge
	 * @param auditId Audit ID
	 * @param proof ZK proof bytes
	 * @param publicInputs Public inputs for verification
	 * @returns Transaction hash
	 */
	async submitAuditProof(auditId: bigint, proof: Hash, publicInputs: Hash[]) {
		if (!this.walletClient)
			throw new Error("Wallet client required for write operations");

		return await this.walletClient.writeContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "submitAuditProof",
			account: this.walletClient.account,
			args: [auditId, proof, publicInputs],
		});
	}

	/**
	 * Slash provider for expired audit (permissionless)
	 * @param auditId Audit ID that expired
	 * @returns Transaction hash
	 */
	async slashExpiredAudit(auditId: bigint) {
		if (!this.walletClient)
			throw new Error("Wallet client required for write operations");

		return await this.walletClient.writeContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "slashExpiredAudit",
			account: this.walletClient.account,
			args: [auditId],
		});
	}

	// ============================================
	// STAKE MANAGEMENT
	// ============================================

	/**
	 * Withdraw stake if all batches audited and passed
	 * @param modelId Model ID
	 * @returns Transaction hash
	 */
	async withdrawStake(modelId: bigint) {
		if (!this.walletClient)
			throw new Error("Wallet client required for write operations");

		return await this.walletClient.writeContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "withdrawStake",
			account: this.walletClient.account,
			args: [modelId],
		});
	}

	// ============================================
	// READ FUNCTIONS
	// ============================================

	/**
	 * Get model details by ID
	 */
	async getModel(modelId: bigint) {
		return this.publicClient.readContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "getModel",
			args: [modelId],
		});
	}
	async getModels() {
		return this.publicClient.readContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "getAllModels",
		});
	}

	/**
	 * Get model by weights hash
	 */
	async getModelByHash(weightsHash: Hash) {
		return this.publicClient.readContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "getModelByWeightsHash",
			args: [weightsHash],
		});
	}

	/**
	 * Get model ID by weights hash
	 */
	async getModelIdByHash(weightsHash: Hash) {
		return this.publicClient.readContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "getModelIdByWeightsHash",
			args: [weightsHash],
		});
	}

	/**
	 * Get batch details
	 */
	async getBatch(batchId: bigint) {
		return this.publicClient.readContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "getBatch",
			args: [batchId],
		});
	}

	/**
	 * Get audit details
	 */
	async getAudit(auditId: bigint) {
		return this.publicClient.readContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "getAudit",
			args: [auditId],
		});
	}

	/**
	 * Get all models by provider address
	 */
	async getModelsByProvider(provider: Address) {
		return this.publicClient.readContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "getModelsByProvider",
			args: [provider],
		});
	}

	/**
	 * Get all batches for a model
	 */
	async getBatchesByModel(modelId: bigint) {
		return this.publicClient.readContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "getBatchesByModel",
			args: [modelId],
		});
	}

	/**
	 * Get total number of models
	 */
	async getTotalModels() {
		return this.publicClient.readContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "getTotalModels",
		});
	}

	/**
	 * Get total number of batches
	 */
	async getTotalBatches() {
		return this.publicClient.readContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "getTotalBatches",
		});
	}

	/**
	 * Get total number of audits
	 */
	async getTotalAudits() {
		return this.publicClient.readContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "getTotalAudits",
		});
	}

	/**
	 * Get contract constants
	 */
	async getConstants() {
		const [providerStake, auditDeadline, requiredSamples] = await Promise.all([
			this.publicClient.readContract({
				address: this.contractAddress,
				abi: zkFairAbi,
				functionName: "PROVIDER_STAKE",
			}),
			this.publicClient.readContract({
				address: this.contractAddress,
				abi: zkFairAbi,
				functionName: "AUDIT_RESPONSE_DEADLINE",
			}),
			this.publicClient.readContract({
				address: this.contractAddress,
				abi: zkFairAbi,
				functionName: "REQUIRED_SAMPLES",
			}),
		]);

		return {
			providerStake,
			auditDeadline,
			requiredSamples,
		};
	}

	// ============================================
	// EVENT WATCHERS
	// ============================================

	watchModelRegistered(callback: (event: ModelRegisteredEvent) => void) {
		return this.publicClient.watchContractEvent({
			address: this.contractAddress,
			abi: zkFairAbi,
			eventName: "ModelRegistered",
			onLogs: (logs) => {
				for (const log of logs) {
					callback(log.args as ModelRegisteredEvent);
				}
			},
		});
	}

	watchModelCertified(callback: (event: ModelCertifiedEvent) => void) {
		return this.publicClient.watchContractEvent({
			address: this.contractAddress,
			abi: zkFairAbi,
			eventName: "ModelCertified",
			onLogs: (logs) => {
				for (const log of logs) {
					callback(log.args as ModelCertifiedEvent);
				}
			},
		});
	}

	watchBatchCommitted(callback: (event: BatchCommittedEvent) => void) {
		return this.publicClient.watchContractEvent({
			address: this.contractAddress,
			abi: zkFairAbi,
			eventName: "BatchCommitted",
			onLogs: (logs) => {
				for (const log of logs) {
					callback(log.args as BatchCommittedEvent);
				}
			},
		});
	}

	watchAuditRequested(callback: (event: AuditRequestedEvent) => void) {
		return this.publicClient.watchContractEvent({
			address: this.contractAddress,
			abi: zkFairAbi,
			eventName: "AuditRequested",
			onLogs: (logs) => {
				for (const log of logs) {
					callback(log.args as AuditRequestedEvent);
				}
			},
		});
	}

	watchAuditProofSubmitted(
		callback: (event: AuditProofSubmittedEvent) => void,
	) {
		return this.publicClient.watchContractEvent({
			address: this.contractAddress,
			abi: zkFairAbi,
			eventName: "AuditProofSubmitted",
			onLogs: (logs) => {
				for (const log of logs) {
					callback(log.args as AuditProofSubmittedEvent);
				}
			},
		});
	}

	watchAuditExpired(callback: (event: AuditExpiredEvent) => void) {
		return this.publicClient.watchContractEvent({
			address: this.contractAddress,
			abi: zkFairAbi,
			eventName: "AuditExpired",
			onLogs: (logs) => {
				for (const log of logs) {
					callback(log.args as AuditExpiredEvent);
				}
			},
		});
	}

	watchProviderSlashed(callback: (event: ProviderSlashedEvent) => void) {
		return this.publicClient.watchContractEvent({
			address: this.contractAddress,
			abi: zkFairAbi,
			eventName: "ProviderSlashed",
			onLogs: (logs) => {
				for (const log of logs) {
					callback(log.args as ProviderSlashedEvent);
				}
			},
		});
	}

	watchStakeWithdrawn(callback: (event: StakeWithdrawnEvent) => void) {
		return this.publicClient.watchContractEvent({
			address: this.contractAddress,
			abi: zkFairAbi,
			eventName: "StakeWithdrawn",
			onLogs: (logs) => {
				for (const log of logs) {
					callback(log.args as StakeWithdrawnEvent);
				}
			},
		});
	}

	// ============================================
	// HISTORICAL EVENT QUERIES
	// ============================================

	async getModelRegisteredEvents(fromBlock?: bigint, toBlock?: bigint) {
		const logs = await this.publicClient.getContractEvents({
			address: this.contractAddress,
			abi: zkFairAbi,
			eventName: "ModelRegistered",
			fromBlock: fromBlock ?? "earliest",
			toBlock: toBlock ?? "latest",
		});
		return logs.map((log) => log.args);
	}

	async getBatchCommittedEvents(fromBlock?: bigint, toBlock?: bigint) {
		const logs = await this.publicClient.getContractEvents({
			address: this.contractAddress,
			abi: zkFairAbi,
			eventName: "BatchCommitted",
			fromBlock: fromBlock ?? "earliest",
			toBlock: toBlock ?? "latest",
		});
		return logs.map((log) => log.args);
	}

	async getAuditRequestedEvents(fromBlock?: bigint, toBlock?: bigint) {
		const logs = await this.publicClient.getContractEvents({
			address: this.contractAddress,
			abi: zkFairAbi,
			eventName: "AuditRequested",
			fromBlock: fromBlock ?? "earliest",
			toBlock: toBlock ?? "latest",
		});
		return logs.map((log) => log.args);
	}
}
