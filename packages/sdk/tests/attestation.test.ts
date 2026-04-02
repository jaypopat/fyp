import path from "node:path";
import { getArtifactDir } from "../utils";

async function attestProof(weightsHash: `0x${string}`) {
	const dir = getArtifactDir(weightsHash);
	const file = await Bun.file(path.join(dir, "proof.json")).json();

	const attestationResponse = await fetch(
		"http://localhost:3000/attest/training",
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				proof: file.proof,
				publicInputs: file.publicInputs,
				weightsHash,
			}),
		},
	);

	if (!attestationResponse.ok) {
		const error = (await attestationResponse.json()) as Record<string, unknown>;
		throw new Error(
			`Attestation service error: ${(error.error as string) || attestationResponse.statusText}`,
		);
	}
	const result = await attestationResponse.json();
	console.log("Attestation Success:", result);
}
attestProof(
	"0x09c72f51dff5a78d0789300c09349b0ee875c6463f047b19399b1d2a81f9b91a",
);
