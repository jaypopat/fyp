import { AlertCircle, Loader2 } from "lucide-react";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { SentinelReceipt } from "@/lib/db";
import { ReceiptRow } from "./receipt-row";

interface ReceiptsTableProps {
	receipts: SentinelReceipt[] | undefined;
	checking: number | null;
	onCheck: (receipt: SentinelReceipt) => void;
	onDispute: (receipt: SentinelReceipt) => void;
}

export function ReceiptsTable({
	receipts,
	checking,
	onCheck,
	onDispute,
}: ReceiptsTableProps) {
	if (!receipts) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (receipts.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-center">
				<AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
				<h3 className="font-semibold text-lg">No receipts yet</h3>
				<p className="text-muted-foreground text-sm">
					Make inference queries to see receipts here
				</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-16">Seq #</TableHead>
						<TableHead>Model</TableHead>
						<TableHead>Prediction</TableHead>
						<TableHead>Time</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="w-32">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{receipts.map((receipt) => (
						<ReceiptRow
							key={receipt.id}
							receipt={receipt}
							checking={checking}
							onCheck={onCheck}
							onDispute={onDispute}
						/>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
