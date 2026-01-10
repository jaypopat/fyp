import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SDKModel } from "@/lib/sdk-types";
import { HashField, LifecycleRow } from "./hash-field";

interface ModelMetadataProps {
	model: SDKModel;
	copiedField: string | null;
	onCopy: (field: string, value: string) => void;
}

export function ModelMetadata({
	model,
	copiedField,
	onCopy,
}: ModelMetadataProps) {
	const proofHashValue =
		model.proofHash === "0x" || model.proofHash === "0x0"
			? undefined
			: model.proofHash;

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="font-semibold text-base">Metadata</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<HashField
					label="Weights Hash"
					value={model.weightsHash}
					copied={copiedField === "Weights Hash"}
					onCopy={(value) => onCopy("Weights Hash", value)}
				/>
				<HashField
					label="Dataset Root"
					value={model.datasetMerkleRoot}
					copied={copiedField === "Dataset Root"}
					onCopy={(value) => onCopy("Dataset Root", value)}
				/>
				<HashField
					label="Proof Hash"
					value={proofHashValue}
					copied={copiedField === "Proof Hash"}
					onCopy={(value) => onCopy("Proof Hash", value)}
					fallback="Not available"
				/>
				<div className="space-y-1">
					<p className="text-muted-foreground text-xs">Inference URL</p>
					<a
						href={model.inferenceUrl}
						target="_blank"
						rel="noreferrer"
						className="break-all text-sm underline-offset-4 hover:underline"
					>
						{model.inferenceUrl}
					</a>
				</div>
			</CardContent>
		</Card>
	);
}

interface ModelLifecycleProps {
	model: SDKModel;
}

export function ModelLifecycle({ model }: ModelLifecycleProps) {
	const registrationLabel = new Date(
		model.registrationTimestamp * 1000,
	).toLocaleString();
	const verificationLabel = model.verificationTimestamp
		? new Date(model.verificationTimestamp * 1000).toLocaleString()
		: "Not verified";

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="font-semibold text-base">Lifecycle</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<LifecycleRow label="Registered" value={registrationLabel} />
				<LifecycleRow
					label="Verification"
					value={verificationLabel}
					muted={!model.verificationTimestamp}
				/>
			</CardContent>
		</Card>
	);
}
