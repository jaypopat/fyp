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
  // Counter read methods
  // -----------------------------
  async getCount(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: counterAbi,
      functionName: "number",
    });
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
  async increment(): Promise<unknown> {
    if (!this.walletClient) throw new Error("Wallet client required for write operations");

    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: counterAbi,
      functionName: "increment",
      account: this.walletClient.account,
    });
  }

  async setNumber(newNumber: bigint): Promise<unknown> {
    if (!this.walletClient) throw new Error("Wallet client required for write operations");

    return this.walletClient.writeContract({
      address: this.contractAddress,
      abi: counterAbi,
      functionName: "setNumber",
      account: this.walletClient.account,
      args: [newNumber],
    });
  }

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
  async getModel(modelId: bigint) {
    return this.publicClient.readContract({
      address: this.contractAddress,
      abi: zkFairAbi,
      functionName: "getModel",
      args: [modelId],
    });
  }
}
