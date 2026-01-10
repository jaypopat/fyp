import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { DemoMode } from "@/lib/demo";

export type Scenario = {
	id: DemoMode;
	title: string;
	icon: React.ComponentType<{ className?: string }>;
	description: string;
	steps: string[];
	color: string;
};

interface ScenarioCardProps {
	scenario: Scenario;
	loading: boolean;
	onSelect: (mode: DemoMode) => void;
}

export function ScenarioCard({
	scenario,
	loading,
	onSelect,
}: ScenarioCardProps) {
	return (
		<Card
			className="flex cursor-pointer flex-col transition-all hover:border-primary hover:shadow-lg"
			onClick={() => !loading && onSelect(scenario.id)}
		>
			<CardHeader>
				<div className="flex items-center gap-2">
					<scenario.icon className={`h-6 w-6 ${scenario.color}`} />
					<CardTitle className="text-lg">{scenario.title}</CardTitle>
				</div>
				<CardDescription>{scenario.description}</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col">
				<div className="flex-1 space-y-2 text-muted-foreground text-sm">
					{scenario.steps.map((step, idx) => (
						<div
							key={`${scenario.id}-step-${idx}`}
							className="flex items-center gap-2"
						>
							<span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs">
								{idx + 1}
							</span>
							{step}
						</div>
					))}
				</div>
				<Button className="mt-4 w-full gap-2" disabled={loading}>
					<Play className="h-4 w-4" />
					Start Scenario
				</Button>
			</CardContent>
		</Card>
	);
}
