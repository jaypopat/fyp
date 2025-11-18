import { join } from "node:path";
import * as ort from "onnxruntime-node";
import registryData from "../registry.json";

// model id is the contract identifier for the registered model

export async function loadAllModels() {
	const models = new Map<number, ort.InferenceSession>();

	async function loadModel(modelId: number, modelPath: string) {
		const modelFile = Bun.file(modelPath);
		const modelBuffer = await modelFile.arrayBuffer();
		const session = await ort.InferenceSession.create(modelBuffer);
		models.set(modelId, session);
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
		const modelId = modelMetadata.id;
		try {
			// Strip the ../../examples/ prefix from registry path
			const relativePath = modelMetadata.path.replace(
				/^\.\.\/\.\.\/examples\//,
				"",
			);
			const fullPath = join(examplesPath, relativePath);

			await loadModel(modelId, fullPath);
		} catch (err) {
			console.error(`Failed to load model ${modelId}:`, err);
			throw err;
		}
	}

	return models;
}
