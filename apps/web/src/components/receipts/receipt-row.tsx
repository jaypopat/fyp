import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Gavel,
	Loader2,
	Radio,
	RefreshCw,
	Scale,
	Shield,
} from "lucide-react";
import type { Hex } from "viem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { config } from "@/config";
import type { SentinelReceipt } from "@/lib/db";

interface ReceiptRowProps {
	receipt: SentinelReceipt;
	checking: number | null;
	onCheck: (receipt: SentinelReceipt) => void;
	onDispute: (receipt: SentinelReceipt) => void;
}

export function ReceiptRow({
	receipt,
	checking,
	onCheck,
	onDispute,
}: ReceiptRowProps) {
	const formatPrediction = (prediction: number): string => {
		return prediction >= 0.5 ? ">50K" : "<=50K";
	};

	return (
		<TableRow
			className={
				receipt.status === "FRAUD_DETECTED"
					? "bg-destructive/10 hover:bg-destructive/20"
					: ""
			}
		>
			<TableCell className="font-mono text-sm">
				#{receipt.seqNum}
				{receipt.status === "FRAUD_DETECTED" && (
					<Radio className="ml-1 inline h-3 w-3 animate-pulse text-destructive" />
				)}
			</TableCell>
			<TableCell>{receipt.modelId}</TableCell>
			<TableCell className="font-mono">
				{formatPrediction(receipt.prediction)}
			</TableCell>
			<TableCell className="text-sm">
				{new Date(receipt.timestamp).toLocaleString(undefined, {
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				})}
			</TableCell>
			<TableCell>
				<ReceiptStatusBadge status={receipt.status} />
			</TableCell>
			<TableCell>
				<ReceiptActions
					receipt={receipt}
					checking={checking}
					onCheck={onCheck}
					onDispute={onDispute}
				/>
			</TableCell>
		</TableRow>
	);
}

export function ReceiptStatusBadge({
	status,
}: {
	status: SentinelReceipt["status"];
}) {
	switch (status) {
		case "PENDING":
			return (
				<Badge variant="outline" className="gap-1">
					<Clock className="h-3 w-3" />
					Pending
				</Badge>
			);
		case "BATCHED":
		case "COMMITTED":
			return (
				<Badge variant="secondary" className="gap-1">
					<Shield className="h-3 w-3" />
					Batched
				</Badge>
			);
		case "VERIFIED":
			return (
				<Badge
					variant="default"
					className="gap-1 bg-green-600 hover:bg-green-700"
				>
					<CheckCircle2 className="h-3 w-3" />
					Verified
				</Badge>
			);
		case "FRAUD_DETECTED":
			return (
				<Badge variant="destructive" className="gap-1">
					<AlertTriangle className="h-3 w-3" />
					Fraud Detected
				</Badge>
			);
		case "DISPUTED":
			return (
				<Badge variant="secondary" className="gap-1 bg-purple-600">
					<Gavel className="h-3 w-3" />
					Disputed
				</Badge>
			);
		default:
			return <Badge variant="outline">{status}</Badge>;
	}
}

interface ReceiptActionsProps {
	receipt: SentinelReceipt;
	checking: number | null;
	onCheck: (receipt: SentinelReceipt) => void;
	onDispute: (receipt: SentinelReceipt) => void;
}

function ReceiptActions({
	receipt,
	checking,
	onCheck,
	onDispute,
}: ReceiptActionsProps) {
	return (
		<div className="flex items-center gap-1">
			{(receipt.status === "PENDING" ||
				receipt.status === "BATCHED" ||
				receipt.status === "COMMITTED") && (
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onCheck(receipt)}
					disabled={checking === receipt.seqNum}
					title="Verify receipt"
				>
					{checking === receipt.seqNum ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<RefreshCw className="h-4 w-4" />
					)}
				</Button>
			)}
			{receipt.status === "FRAUD_DETECTED" && receipt.fraudType && (
				<Button
					variant="destructive"
					size="sm"
					onClick={() => onDispute(receipt)}
					className="gap-1 text-black"
				>
					<Gavel className="h-3 w-3" />
					Dispute
				</Button>
			)}
			{receipt.status === "DISPUTED" && receipt.disputeTxHash && (
				<a
					href={`${config.explorerBase}/tx/${receipt.disputeTxHash}`}
					target="_blank"
					rel="noreferrer"
					className="flex items-center gap-1 text-purple-600 text-xs hover:underline"
				>
					<Scale className="h-3 w-3" />
					Dispute Tx ↗
				</a>
			)}
			{receipt.batchTxHash && (
				<a
					href={`${config.explorerBase}/tx/${receipt.batchTxHash}`}
					target="_blank"
					rel="noreferrer"
					className="text-blue-600 text-xs hover:underline"
				>
					Tx ↗
				</a>
			)}
		</div>
	);
}
