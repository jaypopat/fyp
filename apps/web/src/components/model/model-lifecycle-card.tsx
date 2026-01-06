import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LifecycleRow } from "./hash-field";

interface ModelLifecycleCardProps {
	model: {
		registrationTimestamp: number;
		verificationTimestamp?: number | null;
	};
}

export function ModelLifecycleCard({ model }: ModelLifecycleCardProps) {
	const registrationLabel = new Date(
		model.registrationTimestamp * 1000,
	).toLocaleString();
	const verificationLabel = model.verificationTimestamp
		? new Date(model.verificationTimestamp * 1000).toLocaleString()
		: "Not verified";

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="font-semibold text-base">Lifecycle</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<LifecycleRow label="Registered" value={registrationLabel} />
				<LifecycleRow
					label="Verification"
					value={verificationLabel}
					muted={!model.verificationTimestamp}
				/>
			</CardContent>
		</Card>
	);
}
