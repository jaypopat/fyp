export class Client {
	runInference(modelHash: string, inputData: any): any {
		console.log(
			`Running inference on model ${modelHash} with input:`,
			inputData,
		);
		fetch("model-provider-hosted-url", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ modelHash, inputData }),
		});
		return { result: "inference result" };
	}
}
