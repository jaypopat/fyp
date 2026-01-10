import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
	title: string;
	description?: string;
	action?: {
		label: string;
		icon?: ReactNode;
		onClick: () => void;
		variant?: "default" | "outline" | "secondary" | "destructive" | "ghost";
	};
	badge?: ReactNode;
}

export function PageHeader({
	title,
	description,
	action,
	badge,
}: PageHeaderProps) {
	return (
		<div className="flex items-center justify-between">
			<div>
				<h1 className="font-bold text-2xl">{title}</h1>
				{description && <p className="text-muted-foreground">{description}</p>}
			</div>
			<div className="flex items-center gap-2">
				{badge}
				{action && (
					<Button
						variant={action.variant ?? "outline"}
						size="sm"
						onClick={action.onClick}
					>
						{action.icon}
						{action.label}
					</Button>
				)}
			</div>
		</div>
	);
}
