import * as ort from "onnxruntime-node";
import { join } from "path";
import registryData from "../registry.json";

// model id is the contract identifier for the registered model

export async function loadAllModels() {
	const models = new Map<number, ort.InferenceSession>();

	for (const modelMetadata of registryData.models) {
		const modelId = modelMetadata.id;
		try {
			const fullPath = join(process.cwd(), modelMetadata.path);
			const modelFile = Bun.file(fullPath);

			if (!(await modelFile.exists())) {
				throw new Error(`Model file not found: ${fullPath}`);
			}

			const modelBuffer = await modelFile.arrayBuffer();
			const session = await ort.InferenceSession.create(modelBuffer);

			models.set(modelId, session);

			console.log(`✅ Loaded model ${modelId} (${modelMetadata.name})`);
		} catch (err) {
			console.error(`❌ Failed to load model ${modelId}:`, err);
			throw err;
		}
	}

	return models;
}
