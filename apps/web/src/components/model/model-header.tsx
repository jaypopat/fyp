import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { config } from "@/config";
import { getModelStatusBadge } from "@/lib/model-status";
import type { SDKModel } from "@/lib/sdk-types";

interface ModelHeaderProps {
	model: SDKModel;
}

export function ModelHeader({ model }: ModelHeaderProps) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
					<div className="space-y-4">
						<Button variant="ghost" size="sm" className="-ml-3 w-fit" asChild>
							<Link to="/" className="inline-flex items-center gap-2">
								<ArrowLeft className="h-4 w-4" />
								<span>Back to models</span>
							</Link>
						</Button>
						<CardTitle className="font-semibold text-2xl text-foreground leading-tight">
							{model.name}
						</CardTitle>
						<CardDescription className="text-sm">
							Registered by{" "}
							<a
								href={`${config.explorerBase}/address/${model.author}`}
								target="_blank"
								rel="noreferrer"
								className="underline-offset-4 hover:underline"
								title="View author on explorer"
							>
								<code className="rounded bg-muted px-1.5 py-0.5 text-xs">
									{model.author}
								</code>
							</a>
						</CardDescription>
					</div>
					<div className="shrink-0">{getModelStatusBadge(model.status)}</div>
				</div>
			</CardHeader>
			{model.description && (
				<CardContent className="pt-0 text-muted-foreground text-sm">
					{model.description}
				</CardContent>
			)}
		</Card>
	);
}
