import { CheckCircle2, XCircle } from "lucide-react";

type StepStatus = "pending" | "in-progress" | "complete" | "fraud";

interface StepTrackerProps {
	steps: string[];
	currentStep: number;
	fraudAtStep?: number;
}

export function StepTracker({
	steps,
	currentStep,
	fraudAtStep,
}: StepTrackerProps) {
	return (
		<div className="space-y-2">
			{steps.map((step, stepIndex) => {
				let status: StepStatus = "pending";
				if (stepIndex < currentStep) status = "complete";
				else if (stepIndex === currentStep) status = "in-progress";
				if (fraudAtStep !== undefined && stepIndex === fraudAtStep)
					status = "fraud";

				return (
					<div key={step} className="flex items-center gap-3">
						<StepIndicator status={status} index={stepIndex} />
						<span
							className={`text-sm ${
								status === "pending" ? "text-muted-foreground" : ""
							} ${status === "fraud" ? "font-medium text-red-500" : ""}`}
						>
							{step}
						</span>
					</div>
				);
			})}
		</div>
	);
}

function StepIndicator({
	status,
	index,
}: {
	status: StepStatus;
	index: number;
}) {
	const baseClasses =
		"flex h-6 w-6 items-center justify-center rounded-full font-medium text-xs";

	const statusClasses = {
		complete: "bg-green-500 text-white",
		"in-progress": "animate-pulse bg-blue-500 text-white",
		fraud: "bg-red-500 text-white",
		pending: "bg-muted text-muted-foreground",
	};

	return (
		<div className={`${baseClasses} ${statusClasses[status]}`}>
			{status === "complete" ? (
				<CheckCircle2 className="h-4 w-4" />
			) : status === "fraud" ? (
				<XCircle className="h-4 w-4" />
			) : (
				index + 1
			)}
		</div>
	);
}
