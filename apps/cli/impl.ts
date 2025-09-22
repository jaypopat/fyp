import ora from "ora";
import { SDK } from "@zkfair/sdk";
import path from "path";
import crypto from "crypto";
import { type TypeOf } from "@drizzle-team/brocli";
import type {
  getModelOptions,
  proveModelBiasOptions,
  getProofStatusOptions,
  verifyProofOptions,
  commitOptions,
} from "./cli-args";

export type GetModelOpts = TypeOf<typeof getModelOptions>;
export type ProveModelBiasOpts = TypeOf<typeof proveModelBiasOptions>;
export type GetProofStatusOpts = TypeOf<typeof getProofStatusOptions>;
export type VerifyProofOpts = TypeOf<typeof verifyProofOptions>;
export type CommitOpts = TypeOf<typeof commitOptions>;

const zkFairSDK = new SDK({
  rpcUrl: process.env.RPC_URL || "",
  privateKey: process.env.PRIVATE_KEY || "",
});

async function computeFileHash(filePath: string): Promise<`0x${string}`> {
  const spinner = ora(`Computing SHA256 hash for file: ${filePath}`).start();
  try {
    const buffer = await Bun.file(filePath).arrayBuffer();
    const hashBuffer = crypto.createHash("sha256").update(new Uint8Array(buffer)).digest();
    const hash = ("0x" + Buffer.from(hashBuffer).toString("hex")) as `0x${string}`;
    spinner.succeed(`Computed hash for ${filePath}: ${hash}`);
    return hash;
  } catch (e) {
    spinner.fail(`Failed to compute hash for ${filePath}`);
    throw e;
  }
}

async function getModelIdByWeightsHash(weightsHash: `0x${string}`): Promise<bigint> {
  const spinner = ora("Checking model existence by weights hash").start();
  try {
    const modelId = await zkFairSDK.model.get(weightsHash);
    spinner.succeed(`Model existence check done. Model ID: ${modelId || 0}`);
    return BigInt(modelId || 0);
  } catch (e) {
    spinner.fail("Failed to check model existence");
    throw e;
  }
}

/**
 * Checks if model exists by weights hash; if not, makes commitment registering model.
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
  let modelId = await getModelIdByWeightsHash(weightsHash);
  if (modelId !== BigInt(0)) {
    console.log(`Model already registered with ID: ${modelId}`);
    throw new Error("Model already registered");
  }
  console.log("Registering new model...");
  const spinner = ora("Reading model weights file").start();
  try {
    const weightsBuffer = await Bun.file(params.modelPath).arrayBuffer();
    spinner.succeed("Read weights file successfully");

    const schemaJson = params.schemaPath
      ? JSON.parse(await Bun.file(params.schemaPath).text())
      : undefined;

    const commitSpinner = ora("Submitting commitment to blockchain").start();
    const tx_hash = await zkFairSDK.commit.makeCommitment(
      params.datasetPath,
      new Uint8Array(weightsBuffer),
      {
        model: {
          name: params.modelMetadata.name || "",
          description: params.modelMetadata.description || "",
          creator: params.modelMetadata.creator || "",
          version: params.modelMetadata.version || "1.0.0",
        },
        schema: schemaJson,
        outPath: params.outPath ?? path.join(process.cwd(), "commitment.json"),
      }
    );
    commitSpinner.succeed("Commitment transaction submitted");
    console.log(`Model registered with tx: ${tx_hash}`);
    return tx_hash;
  } catch (e) {
    spinner.fail("Failed to read weights file or submit commitment");
    throw e;
  }
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
  // zkFairSDK.proof.generateProof(opts.model, opts.data,opts.attributes, opts.schema, opts.out);
  // with the proof call the verify method with the proof bytes and the public inputs
  // get the success tx and then return the response to the end user
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
  if (options.proofHash && !options.proofHash.startsWith("0x")) {
    throw new Error("Invalid proofHash format. It must begin with '0x'.");
  }
  const spinner = ora("Computing or using provided proof hash").start();
  try {
    const proofHash: `0x${string}` = options.proofHash
      ? (options.proofHash as `0x${string}`)
      : await computeFileHash(options.model!);
    spinner.succeed(`Proof hash: ${proofHash}`);
    console.log(`Checking proof status for proof hash: ${proofHash}`);
    const status = await zkFairSDK.proof.getStatus?.(proofHash);
    console.log(`Proof status: ${status}`);
    return status;
  } catch (e) {
    spinner.fail("Failed to get proof status");
    throw e;
  }
}

export async function verifyProof(options: VerifyProofOpts) {
  let publicInputs: string[] = [];

  publicInputs = options.publicInputs.split(",");

  let hashToVerify: `0x${string}`;
  if (options.proofHash) {
    if (!options.proofHash.startsWith("0x")) {
      throw new Error("Invalid proofHash format. It must begin with '0x'.");
    }
    hashToVerify = options.proofHash as `0x${string}`;
  } else if (options.model) {
    hashToVerify = await computeFileHash(options.model);
    console.log(`Computed weights hash from model file: ${hashToVerify}`);
  } else {
    throw new Error("Must provide either model file or proof hash.");
  }
  const spinner = ora("Verifying proof").start();
  try {
    await zkFairSDK.verify.verifyProof(hashToVerify, publicInputs, options.local);
    spinner.succeed("Proof verified successfully");
  } catch (e) {
    spinner.fail("Proof verification failed");
    throw e;
  }
}

export async function listModels() {
  console.log("Fetching all registered models...");
  return await zkFairSDK.model.list();
}

export async function getModel(options: GetModelOpts) {
  console.log("Fetching model", options.modelHash);
  if (!options.modelHash.startsWith("0x")) {
    throw new Error("Invalid model hash format. It must begin with '0x'.");
  }
  return await zkFairSDK.model.get(options.modelHash as `0x${string}`);
}
