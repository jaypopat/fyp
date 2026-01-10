import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
	icon: LucideIcon;
	title: string;
	description?: string;
	action?: React.ReactNode;
}

export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
}: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
			<div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
				<Icon className="h-8 w-8 text-muted-foreground" />
			</div>
			<div className="space-y-1">
				<h3 className="font-medium text-lg">{title}</h3>
				{description && (
					<p className="max-w-sm text-muted-foreground text-sm">
						{description}
					</p>
				)}
			</div>
			{action}
		</div>
	);
}
