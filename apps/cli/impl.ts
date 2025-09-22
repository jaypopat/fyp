import { SDK } from "@zkfair/sdk";
import path from "path";
import { type TypeOf } from "@drizzle-team/brocli";
import type {
  getModelOptions,
  proveModelBiasOptions,
  getProofStatusOptions,
  verifyProofOptions,
  commitOptions,
} from "./cli-args";

import { computeFileHash, withSpinner, validateHexHash } from "./utils";

export type GetModelOpts = TypeOf<typeof getModelOptions>;
export type ProveModelBiasOpts = TypeOf<typeof proveModelBiasOptions>;
export type GetProofStatusOpts = TypeOf<typeof getProofStatusOptions>;
export type VerifyProofOpts = TypeOf<typeof verifyProofOptions>;
export type CommitOpts = TypeOf<typeof commitOptions>;

const zkFairSDK = new SDK({
  rpcUrl: process.env.RPC_URL || "",
  privateKey: process.env.PRIVATE_KEY || "",
});

async function getModelIdByWeightsHash(weightsHash: `0x${string}`): Promise<bigint> {
  return await withSpinner(
    "Checking model existence by weights hash",
    async () => {
      const modelId = await zkFairSDK.model.get(weightsHash);
      return BigInt(modelId || 0);
    },
    "Model existence check done."
  );
}

/**
 * Checks if model exists by weights hash; if not, registers new commitment.
 * Returns tx hash.
 */
async function registerModel(params: {
  modelPath: string;
  datasetPath: string;
  schemaPath?: string;
  modelMetadata: {
    name?: string;
    description?: string;
    creator?: string;
    version?: string;
  };
  outPath?: string;
}): Promise<`0x${string}`> {
  const weightsHash = await computeFileHash(params.modelPath);
  const modelId = await getModelIdByWeightsHash(weightsHash);
  if (modelId !== BigInt(0)) {
    console.log(`Model already registered with ID: ${modelId}`);
    throw new Error("Model already registered");
  }

  const txHash = await withSpinner("Reading model weights file", async () => {
    if (!(await Bun.file(params.modelPath).exists())) {
      throw new Error(`Model file not found: ${params.modelPath}`);
    }

    const weightsBuffer = await Bun.file(params.modelPath).arrayBuffer();

    let schemaJson: any;
    if (params.schemaPath) {
      try {
        schemaJson = await Bun.file(params.schemaPath).json();
      } catch (err) {
        throw new Error(
          `Invalid schema JSON at ${params.schemaPath}: ${(err as Error).message}`
        );
      }
    }
    const outPath = params.outPath ?? path.join(process.cwd(), "commitment.json");


    return await withSpinner(
      "Submitting commitment to blockchain",
      async () =>
        await zkFairSDK.commit.makeCommitment(
          params.datasetPath,
          new Uint8Array(weightsBuffer),
          {
            model: {
              name: params.modelMetadata.name ?? "",
              description: params.modelMetadata.description ?? "",
              creator: params.modelMetadata.creator ?? "",
              version: params.modelMetadata.version ?? "1.0.0",
            },
            schema: schemaJson,
            outPath,
          }
        ),
      "Commitment transaction submitted"
    );
  }, "Weights file read successfully");

  console.log(`✅ Model registered with transaction hash: ${txHash}`);

  return txHash;
}


export async function proveModelBias(opts: ProveModelBiasOpts) {
  console.log("Proving model fairness:", opts);
  return await registerModel({
    modelPath: opts.model,
    datasetPath: opts.data,
    schemaPath: opts.schema,
    modelMetadata: { name: opts.name, description: opts.description },
    outPath: opts.out,
  });
}

export async function commit(opts: CommitOpts) {
  console.log("Committing model and dataset...");
  return await registerModel({
    modelPath: opts.model,
    datasetPath: opts.data,
    schemaPath: opts.schema,
    modelMetadata: { name: opts.name, description: opts.description },
    outPath: opts.out,
  });
}

export async function getProofStatus(options: GetProofStatusOpts) {
  if (!options.proofHash && !options.model) {
    throw new Error("Missing required option: pass --proofHash or --model");
  }

  return await withSpinner("Computing or using provided proof hash", async () => {
    const proofHash = options.proofHash
      ? validateHexHash(options.proofHash)
      : await computeFileHash(options.model);
    console.log(`Checking proof status for proof hash: ${proofHash}`);
    const status = await zkFairSDK.proof.getStatus?.(proofHash);
    console.log(`Proof status: ${status}`);
    return status;
  }, "Proof status fetched");
}

export async function verifyProof(options: VerifyProofOpts) {
  const publicInputs: string[] = options.publicInputs.split(",");

  let hashToVerify: `0x${string}`;
  if (options.proofHash) {
    hashToVerify = validateHexHash(options.proofHash);
  } else if (options.model) {
    hashToVerify = await computeFileHash(options.model);
    console.log(`Computed weights hash from model file: ${hashToVerify}`);
  } else {
    throw new Error("Must provide either model file or proof hash.");
  }

  await withSpinner("Verifying proof", async () => {
    await zkFairSDK.verify.verifyProof(hashToVerify, publicInputs, options.local);
  }, "Proof verified successfully");
}

export async function listModels() {
  console.log("Fetching all registered models...");
  return await zkFairSDK.model.list();
}

export async function getModel(options: GetModelOpts) {
  console.log("Fetching model", options.modelHash);
  const validatedHash = validateHexHash(options.modelHash);
  return await zkFairSDK.model.get(validatedHash);
}
