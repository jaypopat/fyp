import { Badge } from "@/components/ui/badge";

export function getModelStatusBadge(status: number) {
	switch (status) {
		case 0: // Pending Audit
			return (
				<Badge
					variant="outline"
					className="border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
				>
					Pending Audit
				</Badge>
			);
		case 1: // Verified
			return (
				<Badge
					variant="outline"
					className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
				>
					Verified
				</Badge>
			);
		case 2: // Non-Compliant
			return (
				<Badge
					variant="outline"
					className="border-rose-500/20 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-400"
				>
					Non-Compliant
				</Badge>
			);
		default:
			return (
				<Badge variant="outline" className="text-muted-foreground">
					Unknown
				</Badge>
			);
	}
}
