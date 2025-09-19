import { createPublicClient, createWalletClient, http, type Abi, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { ZkFairOptions } from "./types";

export class ContractClient {
  private contractAddress: Address;
  private publicClient;
  private walletClient;

  constructor(options: ZkFairOptions) {
    this.contractAddress = options.contractAddress as Address;
    this.publicClient = createPublicClient({
      transport: http(options.rpcUrl),
    });


    if (options.privateKey) {
      const account = privateKeyToAccount(options.privateKey as `0x${string}`);
      this.walletClient = createWalletClient({
        account,
        transport: http(options.rpcUrl),
      });
    }
  }
}
