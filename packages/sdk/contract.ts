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
import { getDefaultConfig } from "./config";
import type {
	AuditExpiredEvent,
	AuditProofSubmittedEvent,
	AuditRequestedEvent,
	BatchCommittedEvent,
	DisputeRaisedEvent,
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

	constructor(options: ZkFairOptions = {}) {
		const config = getDefaultConfig();

		this.contractAddress = config.contractAddress;
		this.chain = config.chain;
		const rpcUrl = config.rpcUrl;

		this.publicClient = createPublicClient({
			chain: this.chain,
			transport: http(rpcUrl),
		});

		if (options?.privateKey) {
			const account = privateKeyToAccount(options?.privateKey as Hash);
			this.walletClient = createWalletClient({
				account,
				chain: this.chain,
				transport: http(rpcUrl),
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
		inferenceUrl: string,
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
				inferenceUrl,
				weightsHash,
				datasetMerkleRoot,
				BigInt(fairnessThreshold),
			],
			value: stake as bigint,
		});
	}

	/**
	 * Submit certification proof attestation for a model
	 * @param weightsHash Weights hash (model identifier)
	 * @param attestationHash Hash of the attestation
	 * @param signature Signature from attestation service
	 * @returns Transaction hash
	 */
	async submitCertificationProof(
		weightsHash: Hash,
		attestationHash: Hash,
		signature: `0x${string}`,
	) {
		if (!this.walletClient)
			throw new Error("Wallet client required for write operations");

		return await this.walletClient.writeContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "submitCertificationProof",
			account: this.walletClient.account,
			args: [weightsHash, attestationHash, signature],
		});
	}

	/**
	 * Update inference URL for a registered model
	 * @param modelId Model ID
	 * @param newInferenceUrl New inference endpoint URL
	 * @returns Transaction hash
	 */
	async updateInferenceUrl(modelId: bigint, newInferenceUrl: string) {
		if (!this.walletClient)
			throw new Error("Wallet client required for write operations");

		return await this.walletClient.writeContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "updateInferenceUrl",
			account: this.walletClient.account,
			args: [modelId, newInferenceUrl],
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
	 * @param seqNumStart Start sequence number
	 * @param seqNumEnd End sequence number
	 * @returns Transaction hash
	 */
	async commitBatch(
		modelId: bigint,
		merkleRoot: Hash,
		queryCount: bigint,
		seqNumStart: bigint,
		seqNumEnd: bigint,
	) {
		if (!this.walletClient)
			throw new Error("Wallet client required for write operations");

		return await this.walletClient.writeContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "commitBatch",
			account: this.walletClient.account,
			args: [modelId, merkleRoot, queryCount, seqNumStart, seqNumEnd],
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

		// Get required audit stake from contract
		const auditStake = await this.publicClient.readContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "AUDIT_STAKE",
		});

		return await this.walletClient.writeContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "requestAudit",
			account: this.walletClient.account,
			args: [batchId],
			value: auditStake as bigint,
		});
	}

	/**
	 * Submit audit proof in response to challenge
	 * @param auditId Audit ID
	 * @param proof ZK proof bytes
	 * @param publicInputs Public inputs for verification
	 * @returns Transaction hash
	 */
	/**
	 * Submit attestation for an audit proof
	 * @param auditId Audit ID
	 * @param attestationHash Hash of the attestation
	 * @param signature Signature from attestation service
	 * @param passed Whether proof passed or failed
	 * @returns Transaction hash
	 */
	async submitAuditProof(
		auditId: bigint,
		attestationHash: Hash,
		signature: `0x${string}`,
		passed: boolean,
	) {
		if (!this.walletClient)
			throw new Error("Wallet client required for write operations");

		return await this.walletClient.writeContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "submitAuditProof",
			account: this.walletClient.account,
			args: [auditId, attestationHash, signature, passed],
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

	// ============================================
	// PHASE 4: USER DISPUTES
	// ============================================

	/**
	 * Get the required dispute stake amount
	 * @returns Dispute stake amount in wei
	 */
	async getDisputeStake(): Promise<bigint> {
		return this.publicClient.readContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "DISPUTE_STAKE",
		}) as Promise<bigint>;
	}

	/**
	 * Dispute when provider never batched a query (Type A fraud)
	 * User must have a signed receipt from provider proving the query existed
	 * @param modelId Model ID from receipt
	 * @param seqNum Sequence number from receipt
	 * @param timestamp Timestamp from receipt
	 * @param featuresHash Hash of features (for privacy, user doesn't reveal actual features)
	 * @param sensitiveAttr Sensitive attribute from receipt
	 * @param prediction Prediction from receipt (scaled by 1e6)
	 * @param providerSignature Provider's signature on the receipt data
	 * @returns Transaction hash
	 */
	async disputeNonInclusion(
		modelId: bigint,
		seqNum: bigint,
		timestamp: bigint,
		featuresHash: Hash,
		sensitiveAttr: bigint,
		prediction: bigint,
		providerSignature: `0x${string}`,
	) {
		if (!this.walletClient)
			throw new Error("Wallet client required for write operations");

		// Get required dispute stake from contract
		const disputeStake = await this.getDisputeStake();

		return await this.walletClient.writeContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "disputeNonInclusion",
			account: this.walletClient.account,
			args: [
				modelId,
				seqNum,
				timestamp,
				featuresHash,
				sensitiveAttr,
				prediction,
				providerSignature,
			],
			value: disputeStake,
		});
	}

	/**
	 * Dispute when provider batched wrong/tampered data (Type B fraud)
	 * The batch commitment itself is the provider's on-chain attestation.
	 * If seqNum is in range but Merkle proof fails, it's fraud.
	 * @param batchId The batch that claims to contain this query
	 * @param seqNum Sequence number that should be in the batch
	 * @param leafHash The leaf hash computed from user's local receipt data
	 * @param merkleProof Array of sibling hashes for Merkle proof
	 * @param proofPositions Array of positions (0=left, 1=right) for each sibling
	 * @returns Transaction hash
	 */
	async disputeFraudulentInclusion(
		batchId: bigint,
		seqNum: bigint,
		leafHash: Hash,
		merkleProof: Hash[],
		proofPositions: number[],
	) {
		if (!this.walletClient)
			throw new Error("Wallet client required for write operations");

		// Get required dispute stake from contract
		const disputeStake = await this.getDisputeStake();

		return await this.walletClient.writeContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "disputeFraudulentInclusion",
			account: this.walletClient.account,
			args: [batchId, seqNum, leafHash, merkleProof, proofPositions],
			value: disputeStake,
		});
	}

	// ============================================
	// DISPUTE EVENT WATCHER
	// ============================================

	watchDisputeRaised(callback: (event: DisputeRaisedEvent) => void) {
		return this.publicClient.watchContractEvent({
			address: this.contractAddress,
			abi: zkFairAbi,
			eventName: "DisputeRaised",
			onLogs: (logs) => {
				for (const log of logs) {
					callback(log.args as DisputeRaisedEvent);
				}
			},
		});
	}

	async getDisputeRaisedEvents(fromBlock?: bigint, toBlock?: bigint) {
		const logs = await this.publicClient.getContractEvents({
			address: this.contractAddress,
			abi: zkFairAbi,
			eventName: "DisputeRaised",
			fromBlock: fromBlock ?? "earliest",
			toBlock: toBlock ?? "latest",
		});
		return logs.map((log) => log.args);
	}
}
