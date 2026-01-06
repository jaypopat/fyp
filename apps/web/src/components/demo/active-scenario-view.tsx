import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { SentinelReceipt } from "@/lib/db";
import type { DemoMode } from "@/lib/demo";
import type { ProtocolEvent } from "@/lib/event-store";
import { DemoActions } from "./demo-actions";
import { DemoStats } from "./demo-stats";
import type { Scenario } from "./scenario-card";
import { StepTracker } from "./step-tracker";

interface ActiveScenarioViewProps {
	scenario: Scenario;
	currentStep: number;
	fraudStep?: number;
	selectedMode: DemoMode;
	loading: boolean;
	receipts: SentinelReceipt[] | undefined;
	events: ProtocolEvent[];
	onReset: () => void;
	onCommitBatch: () => void;
}

export function ActiveScenarioView({
	scenario,
	currentStep,
	fraudStep,
	selectedMode,
	loading,
	receipts,
	events,
	onReset,
	onCommitBatch,
}: ActiveScenarioViewProps) {
	return (
		<div className="grid gap-6 md:grid-cols-2">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<scenario.icon className={`h-5 w-5 ${scenario.color}`} />
							<CardTitle>{scenario.title}</CardTitle>
						</div>
						<Button variant="outline" size="sm" onClick={onReset}>
							<RefreshCw className="mr-2 h-4 w-4" />
							Reset
						</Button>
					</div>
					<CardDescription>{scenario.description}</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<StepTracker
						steps={scenario.steps}
						currentStep={currentStep}
						fraudAtStep={fraudStep}
					/>
				</CardContent>
			</Card>

			<Card className="flex flex-col">
				<CardHeader>
					<CardTitle>Next Action</CardTitle>
				</CardHeader>
				<CardContent className="flex-1">
					<DemoActions
						currentStep={currentStep}
						selectedMode={selectedMode}
						loading={loading}
						onCommitBatch={onCommitBatch}
					/>
				</CardContent>
			</Card>

			<DemoStats receipts={receipts} events={events} />
		</div>
	);
}
