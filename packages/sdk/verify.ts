import type { ContractClient } from "./client";
import { UltraHonkBackend } from '@aztec/bb.js';
import circuit from '@zkfair/zk-circuits/circuit';

export class VerifyAPI {
  constructor(private contracts: ContractClient) { }

  async verifyProof(
    local?: boolean,
  ): Promise<boolean> {
    const config = await Bun.file("config.json").json();
    if (!config.proof) {
      throw new Error(`No proof found for model "${config.metadata?.name || 'Unknown'}". Run proof generation first.`);
    }

    if (local) {
      console.log("Local verification of proof:");
      const proofData = {
        proof: new Uint8Array(config.proof.data),
        publicInputs: config.proof.publicInputs
      };
      const backend = new UltraHonkBackend(circuit.bytecode);

      const isValid = await backend.verifyProof(proofData);
      if (isValid) {
        console.log(`Model "${config.metadata.name}" proof is mathematically sound`);
      } else {
        console.log('Proof verification failed - proof may be corrupted');
      }
      return isValid
    }
    // onchain verification
    console.log("Onchain verification of proof:");
    // TODO: smart contract verify call
    const proofBytes = new Uint8Array(config.proof.data);
    const proofHex: `0x${string}` = `0x${Array.from(proofBytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')}` as `0x${string}`;
    const isValid = await this.contracts.verifyModel(
      config.commitments?.weightsHash,    // Model identifier
      proofHex,     // Raw proof data
      config.proof.publicInputs    // Public inputs array
    );

    console.log(`✅ On-chain verification result: ${isValid ? 'VALID' : 'INVALID'}`);

    if (isValid) {
      console.log(`   Model "${config.metadata.name}" verified on-chain successfully`);
      console.log('   Fairness attestation recorded on blockchain');
    } else {
      console.log('   ❌ On-chain verification failed');
    }

    return isValid;
  }
}
