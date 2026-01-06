import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Shield,
	XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SentinelReceipt } from "@/lib/db";

type ReceiptStatus = SentinelReceipt["status"];

const STATUS_CONFIG: Record<
	ReceiptStatus,
	{
		icon: typeof Clock;
		label: string;
		variant: "outline" | "secondary" | "default" | "destructive";
		className?: string;
	}
> = {
	PENDING: {
		icon: Clock,
		label: "Pending",
		variant: "outline",
	},
	BATCHED: {
		icon: Shield,
		label: "Batched",
		variant: "secondary",
	},
	COMMITTED: {
		icon: Shield,
		label: "Committed",
		variant: "secondary",
	},
	VERIFIED: {
		icon: CheckCircle2,
		label: "Verified",
		variant: "default",
		className: "bg-green-600 hover:bg-green-700",
	},
	FRAUD_DETECTED: {
		icon: AlertTriangle,
		label: "Fraud Detected",
		variant: "destructive",
	},
	DISPUTED: {
		icon: XCircle,
		label: "Disputed",
		variant: "destructive",
	},
};

interface ReceiptStatusBadgeProps {
	status: ReceiptStatus;
}

export function ReceiptStatusBadge({ status }: ReceiptStatusBadgeProps) {
	const config = STATUS_CONFIG[status];
	const Icon = config.icon;

	return (
		<Badge
			variant={config.variant}
			className={`gap-1 ${config.className ?? ""}`}
		>
			<Icon className="h-3 w-3" />
			{config.label}
		</Badge>
	);
}

// Model status badge
type ModelStatus = "REGISTERED" | "VERIFIED" | "DISPUTED" | "INACTIVE";

const MODEL_STATUS_CONFIG: Record<
	ModelStatus,
	{
		icon: typeof Clock;
		label: string;
		variant: "outline" | "secondary" | "default" | "destructive";
		className?: string;
	}
> = {
	REGISTERED: {
		icon: Clock,
		label: "Registered",
		variant: "outline",
	},
	VERIFIED: {
		icon: CheckCircle2,
		label: "Verified",
		variant: "default",
		className: "bg-green-600 hover:bg-green-700",
	},
	DISPUTED: {
		icon: AlertTriangle,
		label: "Disputed",
		variant: "destructive",
	},
	INACTIVE: {
		icon: XCircle,
		label: "Inactive",
		variant: "secondary",
	},
};

interface ModelStatusBadgeProps {
	status: ModelStatus;
}

export function ModelStatusBadge({ status }: ModelStatusBadgeProps) {
	const config = MODEL_STATUS_CONFIG[status] ?? MODEL_STATUS_CONFIG.REGISTERED;
	const Icon = config.icon;

	return (
		<Badge
			variant={config.variant}
			className={`gap-1 ${config.className ?? ""}`}
		>
			<Icon className="h-3 w-3" />
			{config.label}
		</Badge>
	);
}

// Audit status badge
type AuditStatus = "NONE" | "PENDING" | "PASSED" | "FAILED" | "EXPIRED";

const AUDIT_STATUS_CONFIG: Record<
	AuditStatus,
	{
		icon: typeof Clock;
		label: string;
		variant: "outline" | "secondary" | "default" | "destructive";
		className?: string;
	}
> = {
	NONE: {
		icon: Shield,
		label: "No Audit",
		variant: "outline",
	},
	PENDING: {
		icon: Clock,
		label: "Audit Pending",
		variant: "secondary",
		className: "animate-pulse",
	},
	PASSED: {
		icon: CheckCircle2,
		label: "Audit Passed",
		variant: "default",
		className: "bg-green-600 hover:bg-green-700",
	},
	FAILED: {
		icon: XCircle,
		label: "Audit Failed",
		variant: "destructive",
	},
	EXPIRED: {
		icon: AlertTriangle,
		label: "Audit Expired",
		variant: "destructive",
	},
};

interface AuditStatusBadgeProps {
	status: AuditStatus;
}

export function AuditStatusBadge({ status }: AuditStatusBadgeProps) {
	const config = AUDIT_STATUS_CONFIG[status];
	const Icon = config.icon;

	return (
		<Badge
			variant={config.variant}
			className={`gap-1 ${config.className ?? ""}`}
		>
			<Icon className="h-3 w-3" />
			{config.label}
		</Badge>
	);
}
