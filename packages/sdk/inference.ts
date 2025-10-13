import { Client } from '@zkfair/itmac';
import type { Hex } from "viem";

export class InferenceClient {
  private itmac?: Client;
  constructor(public providerPubKey?: Hex, public macKey?: Hex) {
    if (providerPubKey) {
      this.itmac = new Client(providerPubKey, macKey);
    }
  }

  async predict(params: {
    providerUrl: string;
    modelId: string | number;
    input: number[];
    verifyMac?: boolean; // default true if macKey provided
  }): Promise<{
    modelId: string | number;
    prediction: number;
    timestamp: number;
    inputHash: Hex;
    queryId: string;
    verified: boolean;
    itmac?: {
      providerRand: Hex;
      coins: Hex;
    };
  }> {
    // 1) Generate client coin-flip commitment
    const { clientRand, clientCommit } = this.itmac
      ? this.itmac.generateCommitment()
      : Client.generateCommitment();

    // 2) POST to provider
    const res = await fetch(`${params.providerUrl.replace(/\/$/, '')}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelId: params.modelId,
        input: params.input,
        clientCommit,
        clientRand,
      }),
    });
    if (!res.ok) {
      throw new Error(`Provider error: ${res.status} ${res.statusText}`);
    }
    type PredictResponse = {
      modelId: string | number;
      prediction: number;
      timestamp: number;
      inputHash: Hex;
      queryId: string;
      itmac?: {
        providerRand: Hex;
        coins: Hex;
        transcript: {
          queryId: string;
          modelId: number;
          inputHash: Hex;
          prediction: number;
          timestamp: number;
          coins: Hex;
        };
        bundle: { mac: Hex; providerSignature: Hex };
        providerPublicKey: Hex;
      };
    };
    const data = (await res.json()) as PredictResponse;

    // 3) Verify bundle (signature-only if macKey absent)
    let verified = false;
    if (data.itmac?.transcript && data.itmac?.bundle) {
      // Choose a verifier with a known pubkey: prefer constructor-provided, else response-provided
      const verifier = this.itmac
        ?? (data.itmac.providerPublicKey
          ? new Client(data.itmac.providerPublicKey as Hex, this.macKey)
          : undefined);
      if (verifier) {
        verified = verifier.verifyBundle(
          data.itmac.transcript,
          data.itmac.bundle,
          { verifyMac: params.verifyMac },
        ).valid;
      }
    }

    return {
      modelId: data.modelId,
      prediction: data.prediction,
      timestamp: data.timestamp,
      inputHash: data.inputHash as Hex,
      queryId: data.queryId,
      verified,
      itmac: data.itmac ? { providerRand: data.itmac.providerRand as Hex, coins: data.itmac.coins as Hex } : undefined,
    };
  }
}
