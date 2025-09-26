import ora from "ora";
import crypto from "crypto";

export async function computeFileHash(filePath: string): Promise<`0x${string}`> {
  return await withSpinner(
    `Computing SHA256 hash for file: ${filePath}`,
    async () => {
      const buffer = await Bun.file(filePath).arrayBuffer();
      const hashBuffer = crypto.createHash("sha256").update(new Uint8Array(buffer)).digest();
      const hash = ("0x" + Buffer.from(hashBuffer).toString("hex")) as `0x${string}`;
      return hash;
    },
    `Computed hash for ${filePath}`
  );
}

export async function withSpinner<T>(message: string, fn: () => Promise<T>, successMsg?: string): Promise<T> {
  const spinner = ora(message).start();
  try {
    const result = await fn();
    spinner.succeed(successMsg ?? `${message} succeeded`);
    return result;
  } catch (e) {
    spinner.fail(`${message} failed with error: ${(e as Error).message}`);
    throw e;
  }
}

export function validateHexHash(hash: string) {
  if (!hash.startsWith("0x")) {
    throw new Error(`Invalid format for hash. It must begin with '0x'.`);
  }
  return hash as `0x${string}`;
}
export function modelStatusToString(statusNumeric: number): string {
  const statusMap = ["REGISTERED", "VERIFIED", "FAILED"] as const;

  if (statusNumeric >= 0 && statusNumeric < statusMap.length) {
    return statusMap[statusNumeric]!;
  }
  return "UNKNOWN";
}
