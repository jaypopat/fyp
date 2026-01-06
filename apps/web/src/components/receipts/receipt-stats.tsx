import { AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { SentinelReceipt } from "@/lib/db";

interface ReceiptStatsProps {
	receipts: SentinelReceipt[];
}

export function ReceiptStats({ receipts }: ReceiptStatsProps) {
	const pendingCount = receipts.filter(
		(r) => r.status === "PENDING" || r.status === "BATCHED",
	).length;
	const verifiedCount = receipts.filter(
		(r) => r.status === "VERIFIED" || r.status === "COMMITTED",
	).length;
	const fraudCount = receipts.filter(
		(r) => r.status === "FRAUD_DETECTED" || r.status === "DISPUTED",
	).length;

	return (
		<div className="grid gap-4 md:grid-cols-4">
			<StatItem
				icon={FileText}
				label="Total Receipts"
				value={receipts.length}
			/>
			<StatItem
				icon={Clock}
				label="Pending"
				value={pendingCount}
				color="text-yellow-600"
			/>
			<StatItem
				icon={CheckCircle2}
				label="Verified"
				value={verifiedCount}
				color="text-green-600"
			/>
			<StatItem
				icon={AlertTriangle}
				label="Fraud Detected"
				value={fraudCount}
				color="text-red-600"
			/>
		</div>
	);
}

interface StatItemProps {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: number;
	color?: string;
}

function StatItem({ icon: Icon, label, value, color }: StatItemProps) {
	return (
		<Card className="p-4">
			<div className="flex items-center gap-2">
				<Icon className={`h-4 w-4 ${color ?? "text-muted-foreground"}`} />
				<span className="text-muted-foreground text-sm">{label}</span>
			</div>
			<div className={`mt-1 font-bold text-2xl ${color ?? ""}`}>{value}</div>
		</Card>
	);
}
