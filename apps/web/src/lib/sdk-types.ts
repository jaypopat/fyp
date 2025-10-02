export type SDKModelRaw = {
    name: string;
    author: `0x${string}`;
    description: string;
    datasetMerkleRoot: `0x${string}`;
    weightsHash: `0x${string}`;
    status: number;
    registrationTimestamp: bigint;
    verificationTimestamp: bigint;
    proofHash: `0x${string}`;
};

export type SDKModel = {
    name: string;
    author: `0x${string}`;
    description: string;
    datasetMerkleRoot: `0x${string}`;
    weightsHash: `0x${string}`;
    status: number;
    registrationTimestamp: number;
    verificationTimestamp: number | null;
    proofHash: `0x${string}`;
};

export function normalizeModel(model: SDKModelRaw): SDKModel {
    const registrationTimestamp = Number(model.registrationTimestamp);
    const verificationTimestampNumeric = Number(model.verificationTimestamp);

    return {
        name: model.name,
        author: model.author,
        description: model.description,
        datasetMerkleRoot: model.datasetMerkleRoot,
        weightsHash: model.weightsHash,
        status: model.status,
        proofHash: model.proofHash,
        registrationTimestamp,
        verificationTimestamp:
            verificationTimestampNumeric === 0 ? null : verificationTimestampNumeric,
    };
}

export function normalizeModels(models: readonly SDKModelRaw[]): SDKModel[] {
    return models.map((model) => normalizeModel(model));
}
