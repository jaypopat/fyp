import { zkFairAbi } from "@zkfair/contracts/abi";
import {
	type Address,
	type Chain,
	createPublicClient,
	createWalletClient,
	type Hex,
	http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil } from "viem/chains";
import type { ZkFairOptions } from "./types";

export class ContractClient {
	private contractAddress: Address;
	private publicClient;
	private walletClient?;
	private chain: Chain;

	constructor(options?: ZkFairOptions) {
		this.contractAddress = options?.contractAddress as Address;
		this.chain = options?.chain ?? anvil;

		this.publicClient = createPublicClient({
			chain: this.chain,
			transport: http(options?.rpcUrl ?? "http://localhost:8545"),
		});

		if (options?.privateKey) {
			const account = privateKeyToAccount(options?.privateKey as Hex);
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
		merkleRoot: Hex,
		weightsHash: Hex,
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
	async verifyModel(weightsHash: Hex, proof: Hex, publicInputs: Hex[]) {
		if (!this.walletClient || !this.publicClient)
			throw new Error("Both wallet and public client required");

		// First, simulate to get the return value
		const { result } = await this.publicClient.simulateContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "verifyModel",
			account: this.walletClient.account,
			args: [weightsHash, proof, publicInputs],
		});

		// Then execute the actual transaction
		const hash = await this.walletClient.writeContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "verifyModel",
			account: this.walletClient.account,
			args: [weightsHash, proof, publicInputs],
		});

		console.log(`Transaction hash: ${hash}`);

		// Return the result from simulation
		return result;
	}

	async getModels() {
		return this.publicClient.readContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "getAllModels",
		});
	}
	async getModelByHash(modelId: Hex) {
		return this.publicClient.readContract({
			address: this.contractAddress,
			abi: zkFairAbi,
			functionName: "getModelByHash",
			args: [modelId],
		});
	}
	async getProofStatus(weightsHash: Hex) {
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
