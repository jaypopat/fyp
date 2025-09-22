import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { ZkFairOptions } from "./types";
import { counterAbi, iVerifierAbi, zkFairAbi } from "@zkfair/contracts/abi";
import { mainnet } from "viem/chains";

export class ContractClient {
  private contractAddress: Address;
  private publicClient;
  private walletClient?;
  private chain: Chain;

  constructor(options: ZkFairOptions & { chain?: Chain }) {
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


  // -----------------------------
  // Verifier read method
  // -----------------------------
  async verifyProof(proof: `0x${string}`, publicInputs: `0x${string}`[]): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: iVerifierAbi,
      functionName: "verify",
      args: [proof, publicInputs],
    });
  }

  // -----------------------------
  // Counter write methods
  // -----------------------------
  // async increment(): Promise<unknown> {
  //   if (!this.walletClient) throw new Error("Wallet client required for write operations");

  //   return this.walletClient.writeContract({
  //     address: this.contractAddress,
  //     abi: counterAbi,
  //     functionName: "increment",
  //     account: this.walletClient.account,
  //   });
  // }

  // async setNumber(newNumber: bigint): Promise<unknown> {
  //   if (!this.walletClient) throw new Error("Wallet client required for write operations");

  //   return this.walletClient.writeContract({
  //     address: this.contractAddress,
  //     abi: counterAbi,
  //     functionName: "setNumber",
  //     account: this.walletClient.account,
  //     args: [newNumber],
  //   });
  // }

  // -----------------------------
  //  methods (from main contract)
  // -----------------------------
  async getModels() {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: zkFairAbi,
      functionName: "getAllModels",
    });

  }
  async getModel(modelId: `0x${string}`) {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: zkFairAbi,
      functionName: "getModelIdByHash",
      args: [modelId],
    });
  }
  async getProofStatus(weightsHash: `0x${string}`) {
    const statusNumeric = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: zkFairAbi,
      functionName: "getProofStatusByWeightsHash",
      args: [weightsHash],
    }) as number;

    // Map numeric status to string
    const statusMap = ["REGISTERED", "VERIFIED", "FAILED"] as const;
    if (statusNumeric in statusMap) {
      return statusMap[statusNumeric]!;
    }
    return "UNKNOWN";
  }
}
