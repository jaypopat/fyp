import crypto from "crypto";
import ora from "ora";
import path from "path";

type Hash = `0x${string}`;

export async function computeFileHash(filePath: string): Promise<Hash> {
	return await withSpinner(
		`Computing SHA256 hash for file: ${filePath}`,
		async () => {
			const buffer = await Bun.file(filePath).arrayBuffer();
			const hashBuffer = crypto
				.createHash("sha256")
				.update(new Uint8Array(buffer))
				.digest();
			const hash = ("0x" + Buffer.from(hashBuffer).toString("hex")) as Hash;
			return hash;
		},
		`Computed hash for ${filePath}`,
	);
}

export async function withSpinner<T>(
	message: string,
	fn: () => Promise<T>,
	successMsg?: string,
): Promise<T> {
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

export function validateHash(hash: string) {
	if (!hash.startsWith("0x")) {
		throw new Error(`Invalid format for hash. It must begin with '0x'.`);
	}
	return hash as Hash;
}
export function modelStatusToString(statusNumeric: number): string {
	const statusMap = ["REGISTERED", "VERIFIED", "FAILED"] as const;

	if (statusNumeric >= 0 && statusNumeric < statusMap.length) {
		return statusMap[statusNumeric]!;
	}
	return "UNKNOWN";
}
interface ModelFiles {
	weightsPath: string;
	datasetPath: string;
	fairnessThresholdPath: string;
	modelMetadata: {
		name: string;
		description: string;
		creator?: string;
	};
}

/**
 * Discovers model files from either a directory or explicit paths.
 * If --dir is provided, looks for weights.bin, dataset.csv, fairness_threshold.json, and optionally model.json
 * If explicit paths are provided, uses those directly.
 * CLI metadata flags override model.json metadata.
 */
export async function discoverModelFiles(opts: {
	dir?: string;
	weights?: string;
	data?: string;
	fairnessThreshold?: string;
	name?: string;
	description?: string;
	creator?: string;
}): Promise<ModelFiles> {
	// Validate that either dir OR explicit paths are provided
	if (opts.dir) {
		// Directory mode: discover files in the directory
		if (opts.weights || opts.data || opts.fairnessThreshold) {
			throw new Error(
				"Cannot use --dir with explicit file paths. Use either --dir OR (--weights, --data, --fairness-threshold).",
			);
		}

		const dirPath = path.resolve(opts.dir);
		const weightsPath = path.join(dirPath, "weights.bin");
		const datasetPath = path.join(dirPath, "dataset.csv");
		const fairnessThresholdPath = path.join(dirPath, "fairness_threshold.json");
		const modelJsonPath = path.join(dirPath, "model.json");

		// Check required files exist (validates directory implicitly)
		if (!(await Bun.file(weightsPath).exists())) {
			throw new Error(`weights.bin not found in directory: ${dirPath}`);
		}
		if (!(await Bun.file(datasetPath).exists())) {
			throw new Error(`dataset.csv not found in directory: ${dirPath}`);
		}
		if (!(await Bun.file(fairnessThresholdPath).exists())) {
			throw new Error(
				`fairness_threshold.json not found in directory: ${dirPath}`,
			);
		}

		// Load model.json if it exists
		let modelJson: { name?: string; description?: string; creator?: string } =
			{};
		if (await Bun.file(modelJsonPath).exists()) {
			modelJson = await Bun.file(modelJsonPath).json();
		}

		// CLI flags override model.json
		return {
			weightsPath,
			datasetPath,
			fairnessThresholdPath,
			modelMetadata: {
				name: opts.name || modelJson.name || "Unnamed Model",
				description:
					opts.description || modelJson.description || "No description",
				creator: opts.creator || modelJson.creator,
			},
		};
	}

	// Explicit paths mode: require all three paths
	if (!opts.weights || !opts.data || !opts.fairnessThreshold) {
		throw new Error(
			"Must provide either --dir OR all of (--weights, --data, --fairness-threshold)",
		);
	}

	return {
		weightsPath: opts.weights,
		datasetPath: opts.data,
		fairnessThresholdPath: opts.fairnessThreshold,
		modelMetadata: {
			name: opts.name || "Unnamed Model",
			description: opts.description || "No description",
			creator: opts.creator,
		},
	};
}
