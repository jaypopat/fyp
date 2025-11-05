import * as ort from "onnxruntime-node";
import { join } from "path";

interface ModelMetadata {
	name: string;
	path: string;
	weightsHash: string;
}

// model id is the contract identifier for the registered model
const MODEL_REGISTRY: Record<number, ModelMetadata> = {
	1: {
		name: "adult-income",
		path: "../../examples/adult-income/model.onnx",
		weightsHash: "0xabc123...",
	},
	// 2: {
	// 	name: "credit-score",
	// 	path: "../../examples/credit-score/model.onnx",
	// 	weightsHash: "0xdef456...",
	// },
};

export async function loadAllModels() {
	const models = new Map<number, ort.InferenceSession>();

	for (const [modelIdStr, metadata] of Object.entries(MODEL_REGISTRY)) {
		const modelId = Number(modelIdStr);
		try {
			const fullPath = join(process.cwd(), metadata.path);
			const modelFile = Bun.file(fullPath);

			if (!(await modelFile.exists())) {
				throw new Error(`Model file not found: ${fullPath}`);
			}

			const modelBuffer = await modelFile.arrayBuffer();
			const session = await ort.InferenceSession.create(modelBuffer);

			models.set(modelId, session);

			console.log(`✅ Loaded model ${modelId} (${metadata.name})`);
		} catch (err) {
			console.error(`❌ Failed to load model ${modelId}:`, err);
			throw err;
		}
	}

	return models;
}
