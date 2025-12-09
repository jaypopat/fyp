import { join } from "node:path";
import * as ort from "onnxruntime-node";
import registryData from "../registry.json";

// Models keyed by numeric ID, with hash lookup
export type ModelRegistry = {
	sessions: Map<number, ort.InferenceSession>;
	hashToId: Map<string, number>;
};

export async function loadAllModels(): Promise<ModelRegistry> {
	const sessions = new Map<number, ort.InferenceSession>();
	const hashToId = new Map<string, number>();

	async function loadModel(modelId: number, modelPath: string) {
		const modelFile = Bun.file(modelPath);
		const modelBuffer = await modelFile.arrayBuffer();
		const session = await ort.InferenceSession.create(modelBuffer);
		sessions.set(modelId, session);
		console.log(`Loaded model ${modelId} from ${modelPath}`);
	}

	// Try production path first, fallback to dev
	let examplesPath = join(process.cwd(), "examples/");

	// Check if it exists, otherwise try dev path
	try {
		const testFile = Bun.file(join(examplesPath, "adult-income/model.onnx"));
		if (!(await testFile.exists())) {
			examplesPath = join(process.cwd(), "../../examples/");
		}
	} catch {
		examplesPath = join(process.cwd(), "../../examples/");
	}

	console.log(` Looking for models in: ${examplesPath}`);
	console.log(` Working directory: ${process.cwd()}`);

	for (const modelMetadata of registryData.models) {
		const { id, hash, path } = modelMetadata;

		// Build hash -> id lookup
		hashToId.set(hash.toLowerCase(), id);

		try {
			// Strip the ../../examples/ prefix from registry path
			const relativePath = path.replace(/^\.\.\/\.\.\/examples\//, "");
			const fullPath = join(examplesPath, relativePath);

			await loadModel(id, fullPath);
		} catch (err) {
			console.error(`Failed to load model ${id}:`, err);
			throw err;
		}
	}

	return { sessions, hashToId };
}
