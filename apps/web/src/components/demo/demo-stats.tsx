import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SentinelReceipt } from "@/lib/db";
import type { ProtocolEvent } from "@/lib/event-store";

interface DemoStatsProps {
	receipts: SentinelReceipt[] | undefined;
	events: ProtocolEvent[];
}

export function DemoStats({ receipts, events }: DemoStatsProps) {
	const batchCount = events.filter((e) => e.type === "BATCH_COMMITTED").length;
	const verifiedCount =
		receipts?.filter((r) => r.status === "VERIFIED").length ?? 0;
	const fraudCount =
		receipts?.filter((r) => r.status === "FRAUD_DETECTED").length ?? 0;

	return (
		<Card className="md:col-span-2">
			<CardHeader>
				<CardTitle>Session Stats</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-4 gap-4">
					<StatItem label="Receipts" value={receipts?.length ?? 0} />
					<StatItem label="Batches" value={batchCount} />
					<StatItem label="Verified" value={verifiedCount} color="green" />
					<StatItem label="Fraud Detected" value={fraudCount} color="red" />
				</div>
			</CardContent>
		</Card>
	);
}

interface StatItemProps {
	label: string;
	value: number;
	color?: "green" | "red";
}

function StatItem({ label, value, color }: StatItemProps) {
	const colorClass =
		color === "green"
			? "text-green-500"
			: color === "red"
				? "text-red-500"
				: "";

	return (
		<div className="rounded-lg bg-muted p-4 text-center">
			<div className={`font-bold text-2xl ${colorClass}`}>{value}</div>
			<div className="text-muted-foreground text-sm">{label}</div>
		</div>
	);
}
