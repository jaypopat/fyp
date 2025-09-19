export type ZkFairOptions = {
  rpcUrl: string;
  network?: "local" | "sepolia" | "custom";
  contractAddress?: string; // optional contract address
  privateKey?: string; // optional private key
};
