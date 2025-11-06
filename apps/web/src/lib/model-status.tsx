import { Badge } from "@/components/ui/badge";

export function getModelStatusBadge(status: number) {
	switch (status) {
		case 0: // REGISTERED
			return (
				<Badge
					variant="outline"
					className="border-2 border-blue-300 bg-blue-50 text-blue-700"
				>
					Registered
				</Badge>
			);
		case 1: // CERTIFIED
			return <Badge variant="default" className="bg-green-600">Certified</Badge>;
		case 2: // SLASHED
			return <Badge variant="destructive">Slashed</Badge>;
		default:
			return (
				<Badge variant="outline" className="text-foreground/60">
					Unknown
				</Badge>
			);
	}
}

export function getAuditStatusBadge(status: number) {
	switch (status) {
		case 0: // PENDING
			return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pending</Badge>;
		case 1: // PASSED
			return <Badge variant="outline" className="bg-green-50 text-green-700">Passed</Badge>;
		case 2: // FAILED
			return <Badge variant="destructive">Failed</Badge>;
		case 3: // EXPIRED
			return <Badge variant="outline" className="bg-red-50 text-red-700">Expired</Badge>;
		default:
			return <Badge variant="outline">Unknown</Badge>;
	}
}
