import * as ort from "onnxruntime-node";
import { join } from "path";

export async function loadAllModels() {
	const models = new Map<string, ort.InferenceSession>();

	async function loadModel(modelId: string, modelPath: string) {
		const modelFile = Bun.file(modelPath);
		const modelBuffer = await modelFile.arrayBuffer();
		const session = await ort.InferenceSession.create(modelBuffer);
		models.set(modelId, session);
		console.log(`✅ Loaded model ${modelId} from ${modelPath}`);
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

	console.log(`📂 Looking for models in: ${examplesPath}`);
	console.log(`📂 Working directory: ${process.cwd()}`);

	const glob = new Bun.Glob("*/model.onnx");
	const files = await Array.fromAsync(glob.scan({ cwd: examplesPath }));

	console.log(`📦 Found ${files.length} model files`);

	if (files.length === 0) {
		throw new Error(`No models found in ${examplesPath}`);
	}

	for (const file of files) {
		const parts = file.split("/");
		if (parts[0]) {
			const modelName = parts[0];
			const modelPath = join(examplesPath, file);
			try {
				await loadModel(modelName, modelPath);
			} catch (err) {
				console.error(`❌ Failed to load model ${modelName}:`, err);
				throw err;
			}
		}
	}

	return models;
}
