export type ZkFairOptions = {
  rpcUrl: string;
  network?: "local" | "sepolia" | "custom";
  contractAddress?: string; // optional contract address
  privateKey?: string; // optional private key
};
export type CommitOptions = {
  model: {
    name: string,
    version: string,
    description: string,
    creator: string,
  }
  schema: {
    encodingSchema?: "SCALE" | "JSON"
    cryptoAlgo?: "BLAKE2b" | "SHA256",
    salt?: string,
  },
  outPath?: string,
}
