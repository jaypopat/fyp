import { formatEther } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HashField } from "./hash-field";

interface ModelMetadataCardProps {
	model: {
		weightsHash: string;
		datasetMerkleRoot: string;
		proofHash?: string;
		inferenceUrl: string;
		stake: bigint;
	};
	copiedField: string | null;
	onCopy: (field: string, value: string) => void;
}

export function ModelMetadataCard({
	model,
	copiedField,
	onCopy,
}: ModelMetadataCardProps) {
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
					<p className="text-muted-foreground text-xs">Provider Stake</p>
					<p className="font-mono text-sm">{formatEther(model.stake)} ETH</p>
				</div>
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
