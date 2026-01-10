import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import {
	AlertTriangle,
	Clock,
	FileCheck,
	Gavel,
	Layers,
	RefreshCw,
	Shield,
	XCircle,
} from "lucide-react";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { useEventStore } from "@/lib/event-store";

export const Route = createFileRoute("/activity")({
	component: ActivityPage,
});

function ActivityPage() {
	const events = useEventStore((state) => state.events);
	const clearEvents = useEventStore((state) => state.clearEvents);

	const receipts = useLiveQuery(() => db.receipts.toArray());

	// stats
	const batchCount = events.filter((e) => e.type === "BATCH_COMMITTED").length;
	const auditCount = events.filter((e) => e.type === "AUDIT_REQUESTED").length;
	const disputeCount = events.filter((e) => e.type === "DISPUTE_RAISED").length;
	const slashCount = events.filter((e) => e.type === "PROVIDER_SLASHED").length;

	const pendingReceipts =
		receipts?.filter((r) => r.status === "PENDING").length ?? 0;
	const verifiedReceipts =
		receipts?.filter((r) => r.status === "VERIFIED").length ?? 0;
	const fraudReceipts =
		receipts?.filter((r) => r.status === "FRAUD_DETECTED").length ?? 0;

	return (
		<div className="container mx-auto space-y-6 px-4 py-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl">Activity Feed</h1>
					<p className="text-muted-foreground">
						Real-time protocol events from the current session
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={clearEvents}>
					<RefreshCw className="mr-2 h-4 w-4" />
					Clear Events
				</Button>
			</div>

			<div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
				<Card className="p-4">
					<div className="flex items-center gap-2">
						<Layers className="h-4 w-4 text-blue-500" />
						<span className="text-muted-foreground text-sm">Batches</span>
					</div>
					<div className="mt-1 font-bold text-2xl">{batchCount}</div>
				</Card>
				<Card className="p-4">
					<div className="flex items-center gap-2">
						<Shield className="h-4 w-4 text-yellow-500" />
						<span className="text-muted-foreground text-sm">Audits</span>
					</div>
					<div className="mt-1 font-bold text-2xl">{auditCount}</div>
				</Card>
				<Card className="p-4">
					<div className="flex items-center gap-2">
						<Gavel className="h-4 w-4 text-orange-500" />
						<span className="text-muted-foreground text-sm">Disputes</span>
					</div>
					<div className="mt-1 font-bold text-2xl">{disputeCount}</div>
				</Card>
				<Card className="p-4">
					<div className="flex items-center gap-2">
						<AlertTriangle className="h-4 w-4 text-red-500" />
						<span className="text-muted-foreground text-sm">Slashes</span>
					</div>
					<div className="mt-1 font-bold text-2xl">{slashCount}</div>
				</Card>
				<Card className="p-4">
					<div className="flex items-center gap-2">
						<Clock className="h-4 w-4 text-yellow-500" />
						<span className="text-muted-foreground text-sm">Pending</span>
					</div>
					<div className="mt-1 font-bold text-2xl">{pendingReceipts}</div>
				</Card>
				<Card className="p-4">
					<div className="flex items-center gap-2">
						<FileCheck className="h-4 w-4 text-green-500" />
						<span className="text-muted-foreground text-sm">Verified</span>
					</div>
					<div className="mt-1 font-bold text-2xl">{verifiedReceipts}</div>
				</Card>
				<Card className="p-4">
					<div className="flex items-center gap-2">
						<XCircle className="h-4 w-4 text-red-500" />
						<span className="text-muted-foreground text-sm">Fraud</span>
					</div>
					<div className="mt-1 font-bold text-2xl">{fraudReceipts}</div>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Protocol Events</CardTitle>
					<CardDescription>
						Events are streamed in real-time as they occur on-chain
					</CardDescription>
				</CardHeader>
				<CardContent>
					{events.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<Clock className="mb-4 h-12 w-12 text-muted-foreground" />
							<h3 className="font-semibold text-lg">No events yet</h3>
							<p className="mt-2 max-w-sm text-muted-foreground text-sm">
								Events will appear here as batches are committed, audits
								requested, or disputes raised.
							</p>
							<Button asChild variant="outline" className="mt-4">
								<Link to="/demo">Start a Demo Scenario</Link>
							</Button>
						</div>
					) : (
						<div className="space-y-3">
							{events.map((event, idx) => (
								<EventCard
									key={`${event.type}-${event.timestamp}-${idx}`}
									event={event}
								/>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
