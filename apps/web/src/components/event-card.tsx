import type { LucideIcon } from "lucide-react";
import {
	AlertTriangle,
	CheckCircle2,
	Gavel,
	Layers,
	Shield,
	XCircle,
} from "lucide-react";
import type { ProtocolEvent } from "@/lib/event-store";

interface EventCardProps {
	event: ProtocolEvent;
}

function getEventConfig(event: ProtocolEvent): {
	icon: LucideIcon;
	title: string;
	color: string;
	bgColor: string;
	description: string;
} {
	switch (event.type) {
		case "BATCH_COMMITTED":
			return {
				icon: Layers,
				title: "Batch Committed",
				color: "text-blue-500",
				bgColor: "bg-blue-500/10",
				description: `Model ${event.data.modelId} • Batch #${event.data.batchId} • ${event.data.queryCount} queries`,
			};
		case "AUDIT_REQUESTED":
			return {
				icon: Shield,
				title: "Audit Requested",
				color: "text-yellow-500",
				bgColor: "bg-yellow-500/10",
				description: `Audit #${event.data.auditId} • Batch #${event.data.batchId}`,
			};
		case "AUDIT_PROOF_SUBMITTED":
			return event.data.passed
				? {
						icon: CheckCircle2,
						title: "Audit Passed",
						color: "text-green-500",
						bgColor: "bg-green-500/10",
						description: `Audit #${event.data.auditId} • Provider proved fairness`,
					}
				: {
						icon: XCircle,
						title: "Audit Failed",
						color: "text-red-500",
						bgColor: "bg-red-500/10",
						description: `Audit #${event.data.auditId} • Provider failed to prove fairness`,
					};
		case "DISPUTE_RAISED":
			return {
				icon: Gavel,
				title: "Dispute Raised",
				color: "text-orange-500",
				bgColor: "bg-orange-500/10",
				description: `Model #${event.data.modelId} • Query #${event.data.seqNum}`,
			};
		case "PROVIDER_SLASHED":
			return {
				icon: AlertTriangle,
				title: "Provider Slashed",
				color: "text-red-500",
				bgColor: "bg-red-500/10",
				description: `Model #${event.data.modelId} • Provider stake slashed`,
			};
	}
}

export function EventCard({ event }: EventCardProps) {
	const {
		icon: Icon,
		title,
		color,
		bgColor,
		description,
	} = getEventConfig(event);

	return (
		<div className={`flex items-start gap-4 rounded-lg border p-4 ${bgColor}`}>
			<div
				className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bgColor}`}
			>
				<Icon className={`h-5 w-5 ${color}`} />
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center justify-between gap-2">
					<h4 className={`font-medium ${color}`}>{title}</h4>
					<span className="shrink-0 text-muted-foreground text-xs">
						{new Date(event.timestamp).toLocaleTimeString()}
					</span>
				</div>
				<p className="mt-1 truncate text-muted-foreground text-sm">
					{description}
				</p>
			</div>
		</div>
	);
}
