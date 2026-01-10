import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatCardProps {
	icon: LucideIcon;
	label: string;
	value: number | string;
	iconColor?: string;
}

export function StatCard({
	icon: Icon,
	label,
	value,
	iconColor = "text-muted-foreground",
}: StatCardProps) {
	return (
		<Card className="p-4">
			<div className="flex items-center gap-2">
				<Icon className={`h-4 w-4 ${iconColor}`} />
				<span className="text-muted-foreground text-sm">{label}</span>
			</div>
			<div className="mt-1 font-bold text-2xl">{value}</div>
		</Card>
	);
}
