import { zkFairAbi } from "@zkfair/contracts/abi";
import {
	type Address,
	type Chain,
	createPublicClient,
	createWalletClient,
	http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import type { ZkFairOptions } from "./types";

export class ContractClient {
	private contractAddress: Address;
	private publicClient;
	private walletClient?;
	private chain: Chain;

	constructor(options: ZkFairOptions) {
		this.contractAddress = options.contractAddress as Address;
		this.chain = options.chain ?? mainnet;

		this.publicClient = createPublicClient({
			chain: this.chain,
			transport: http(options.rpcUrl),
		});

		if (options.privateKey) {
			const account = privateKeyToAccount(options.privateKey as `0x${string}`);
			this.walletClient = createWalletClient({
				account,
				chain: this.chain,
				transport: http(options.rpcUrl),
			});
		}
	}

	async createModelAndCommit(
		name: string,
		description: string,
		merkleRoot: `0x${string}`,
		weightsHash: `0x${string}`,
	) {
		if (!this.walletClient)
			throw new Error("Wallet client required for write operations");

		return await this.walletClient.writeContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "registerModel",
			account: this.walletClient.account,
			args: [name, description, merkleRoot, weightsHash],
		});
	}
	async verifyModel(
		modelId: bigint,
		proof: `0x${string}`,
		publicInputs: `0x${string}`[],
	) {
		if (!this.walletClient || !this.publicClient)
			throw new Error("Both wallet and public client required");

		// First, simulate to get the return value
		const { result } = await this.publicClient.simulateContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "verifyModel",
			account: this.walletClient.account,
			args: [modelId, proof, publicInputs],
		});

		// Then execute the actual transaction
		const hash = await this.walletClient.writeContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "verifyModel",
			account: this.walletClient.account,
			args: [modelId, proof, publicInputs],
		});

		console.log(`Transaction hash: ${hash}`);

		// Return the boolean result from simulation
		return result as boolean;
	}

	async getModels() {
		return this.publicClient.readContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "getAllModels",
		});
	}
	async getModelByHash(modelId: `0x${string}`) {
		return this.publicClient.readContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "getModelByHash",
			args: [modelId],
		});
	}
	async getProofStatus(weightsHash: `0x${string}`) {
		const statusNumeric = (await this.publicClient.readContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "getProofStatusByWeightsHash",
			args: [weightsHash],
		})) as number;

		const statusMap = ["REGISTERED", "VERIFIED", "FAILED"] as const;
		if (statusNumeric >= 0 && statusNumeric < statusMap.length) {
			return statusMap[statusNumeric];
		}
		return "UNKNOWN";
	}
}
