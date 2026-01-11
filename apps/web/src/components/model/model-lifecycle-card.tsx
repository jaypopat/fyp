import { Calendar, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ModelLifecycleCardProps {
	model: {
		registrationTimestamp: number;
		verificationTimestamp?: number | null;
		status: number;
	};
}

export function ModelLifecycleCard({ model }: ModelLifecycleCardProps) {
	const registrationDate = new Date(model.registrationTimestamp * 1000);
	const verificationDate = model.verificationTimestamp
		? new Date(model.verificationTimestamp * 1000)
		: null;

	const daysSinceRegistration = Math.floor(
		(Date.now() - registrationDate.getTime()) / (1000 * 60 * 60 * 24),
	);

	const statusLabels = {
		0: { label: "Registered", color: "bg-blue-500" },
		1: { label: "Certified", color: "bg-green-500" },
		2: { label: "Slashed", color: "bg-red-500" },
	};

	const currentStatus = statusLabels[
		model.status as keyof typeof statusLabels
	] || {
		label: "Unknown",
		color: "bg-gray-500",
	};

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 font-semibold text-base">
					<Calendar className="h-4 w-4" />
					Lifecycle
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Status Timeline */}
				<div className="space-y-3">
					{/* Registration */}
					<div className="flex gap-3">
						<div className="relative flex flex-col items-center">
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500">
								<CheckCircle2 className="h-4 w-4 text-white" />
							</div>
							{model.status >= 1 && (
								<div className="mt-1 h-12 w-0.5 bg-blue-500" />
							)}
						</div>
						<div className="flex-1 pb-4">
							<div className="flex items-center gap-2">
								<p className="font-medium text-sm">Registered</p>
								<Badge variant="outline" className="text-xs">
									{daysSinceRegistration}d ago
								</Badge>
							</div>
							<p className="text-muted-foreground text-xs">
								{registrationDate.toLocaleDateString()} at{" "}
								{registrationDate.toLocaleTimeString()}
							</p>
						</div>
					</div>

					{/* Certification */}
					<div className="flex gap-3">
						<div className="flex flex-col items-center">
							<div
								className={`flex h-8 w-8 items-center justify-center rounded-full ${
									model.status >= 1 ? "bg-green-500" : "bg-muted"
								}`}
							>
								{model.status >= 1 ? (
									<CheckCircle2 className="h-4 w-4 text-white" />
								) : (
									<Clock className="h-4 w-4 text-muted-foreground" />
								)}
							</div>
						</div>
						<div className="flex-1">
							<div className="flex items-center gap-2">
								<p
									className={`font-medium text-sm ${
										model.status < 1 ? "text-muted-foreground" : ""
									}`}
								>
									{model.status >= 1 ? "Certified" : "Awaiting Certification"}
								</p>
							</div>
							{verificationDate ? (
								<p className="text-muted-foreground text-xs">
									{verificationDate.toLocaleDateString()} at{" "}
									{verificationDate.toLocaleTimeString()}
								</p>
							) : (
								<p className="text-muted-foreground text-xs">
									Training verification pending
								</p>
							)}
						</div>
					</div>
				</div>

				{/* Current Status Badge */}
				<div className="border-t pt-3">
					<div className="flex items-center justify-between">
						<p className="text-muted-foreground text-xs">Current Status</p>
						<Badge className={`${currentStatus.color} gap-1 text-white`}>
							<div className="h-2 w-2 rounded-full bg-white" />
							{currentStatus.label}
						</Badge>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
