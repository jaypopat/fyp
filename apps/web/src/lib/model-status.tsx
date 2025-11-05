import { Badge } from "@/components/ui/badge";

export function getModelStatusBadge(status: number) {
	switch (status) {
		case 0: // Pending Audit
			return (
				<Badge
					variant="outline"
					className="border-2 border-border bg-secondary-background text-foreground"
				>
					Pending Audit
				</Badge>
			);
		case 1: // Verified
			return <Badge variant="default">Verified</Badge>;
		case 2: // Non-Compliant
			return <Badge variant="destructive">Non-Compliant</Badge>;
		default:
			return (
				<Badge variant="outline" className="text-foreground/60">
					Unknown
				</Badge>
			);
	}
}
