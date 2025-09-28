import { UltraHonkBackend } from "@aztec/bb.js";
import type { ContractClient } from "./client";
import { parseCSV } from "./utils"
import { Noir, type CompiledCircuit } from '@noir-lang/noir_js';
import circuit from '@zkfair/zk-circuits/circuit';


export class ProofAPI {
  constructor(private contracts: ContractClient) { }

  async generateProof() {
    const config = await Bun.file("config.json").json();

    // get the weights and dataset now
    const weights = await Bun.file(config.filePaths.weights).json();
    const dataset = await parseCSV(config.filePaths.dataset);
    const salts = config.salts;
    // take the above and transform them into circuit inputs

    const noir = new Noir(circuit as CompiledCircuit);
    const { witness } = await noir.execute({} as any);

    const backend = new UltraHonkBackend(circuit.bytecode);
    const proofData = await backend.generateProof(witness);

    const updatedConfig = {
      ...config,
      proof: {
        data: Array.from(proofData.proof),
        publicInputs: proofData.publicInputs,
        generatedAt: Date.now()
      },
      status: "proof_generated"
    };

    // 7. Write updated config back
    await Bun.write("config.json", JSON.stringify(updatedConfig, null, 2));

  }
  async getStatus(weightsHash: `0x${string}`) {
    try {
      const status = await this.contracts.getProofStatus(weightsHash);
      return status;
    } catch (error) {
      console.error("Error fetching proof status:", error);
      throw new Error("Failed to retrieve proof status from contract");
    }
  }
}
