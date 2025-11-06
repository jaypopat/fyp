export type Hex = `0x${string}`;

export type QueryLogRecord = {
	queryId: string;
	modelId: number;
	input: number[];
	prediction: number;
	timestamp: number;
	inputHash: Hex;
};
