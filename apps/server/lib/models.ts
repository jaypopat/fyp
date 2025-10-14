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

    const examples = join(process.cwd(), "../../examples/");
    const glob = new Bun.Glob("*/model.onnx");
    const files = await Array.fromAsync(glob.scan({ cwd: examples }));

    for (const file of files) {
        const parts = file.split("/");
        if (parts[0]) {
            const modelName = parts[0];
            const modelPath = join(examples, file);
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
