import { Badge } from "@/components/ui/badge";

export function getModelStatusBadge(status: number) {
	switch (status) {
		case 0: // REGISTERED
			return (
				<Badge
					variant="outline"
					className="border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-200"
				>
					Registered
				</Badge>
			);
		case 1: // CERTIFIED
			return (
				<Badge className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800">
					Certified
				</Badge>
			);
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
			return (
				<Badge
					variant="outline"
					className="border-yellow-400 bg-yellow-50 text-yellow-700 dark:border-yellow-500 dark:bg-yellow-950 dark:text-yellow-200"
				>
					Pending
				</Badge>
			);
		case 1: // PASSED
			return (
				<Badge
					variant="outline"
					className="border-green-400 bg-green-50 text-green-700 dark:border-green-500 dark:bg-green-950 dark:text-green-200"
				>
					Passed
				</Badge>
			);
		case 2: // FAILED
			return <Badge variant="destructive">Failed</Badge>;
		case 3: // EXPIRED
			return (
				<Badge
					variant="outline"
					className="border-red-400 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-950 dark:text-red-200"
				>
					Expired
				</Badge>
			);
		default:
			return <Badge variant="outline">Unknown</Badge>;
	}
}
