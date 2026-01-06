import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, Shield, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
	ActiveScenarioView,
	DemoHeader,
	type Scenario,
	ScenarioCard,
} from "@/components/demo";
import { Card, CardContent } from "@/components/ui/card";
import { db, type SentinelReceipt } from "@/lib/db";
import {
	clearDemoPersistence,
	type DemoMode,
	commitBatch as demoCommitBatch,
	getPersistedDemoMode,
	getServerMode,
	isDemoMode,
	setDemoMode,
	setPersistedDemoMode,
	setServerMode,
} from "@/lib/demo";
import { useEventStore } from "@/lib/event-store";

export const Route = createFileRoute("/demo")({
	component: DemoPage,
});

const SCENARIOS: Scenario[] = [
	{
		id: "honest",
		title: "Honest Provider",
		icon: Shield,
		description:
			"Provider batches all queries correctly. Your receipt will be verified on-chain.",
		steps: [
			"Make inference query",
			"Receive signed receipt",
			"Wait for batch commitment",
			"Receipt verified ✓",
		],
		color: "text-green-500",
	},
	{
		id: "non-inclusion",
		title: "Non-Inclusion Fraud",
		icon: XCircle,
		description:
			"Provider omits your query from the batch. Fraud is detected automatically.",
		steps: [
			"Make inference query",
			"Receive signed receipt",
			"Provider commits batch WITHOUT your query",
			"Fraud detected → Dispute & get compensated",
		],
		color: "text-red-500",
	},
	{
		id: "fraudulent-inclusion",
		title: "Fraudulent Inclusion",
		icon: AlertTriangle,
		description:
			"Provider tampers with your query data in the batch. Merkle proof fails verification.",
		steps: [
			"Make inference query (prediction=1)",
			"Receive signed receipt",
			"Provider commits batch with TAMPERED data (prediction=0)",
			"Merkle proof fails → Fraud detected → Dispute",
		],
		color: "text-orange-500",
	},
];

function DemoPage() {
	const [selectedMode, setSelectedMode] = useState<DemoMode | null>(null);
	const [serverModeState, setServerModeState] = useState<DemoMode | null>(null);
	const [currentStep, setCurrentStep] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [demoActive, setDemoActive] = useState(isDemoMode());

	const receipts = useLiveQuery<SentinelReceipt[]>(() => db.receipts.toArray());
	const events = useEventStore((state) => state.events);

	useEffect(() => {
		if (!selectedMode || !receipts) return;

		const pendingCount = receipts.filter((r) => r.status === "PENDING").length;
		const verifiedCount = receipts.filter(
			(r) => r.status === "VERIFIED",
		).length;
		const fraudCount = receipts.filter(
			(r) => r.status === "FRAUD_DETECTED",
		).length;
		const batchEvents = events.filter((e) => e.type === "BATCH_COMMITTED");

		if (fraudCount > 0) {
			setCurrentStep(3);
		} else if (verifiedCount > 0) {
			setCurrentStep(4);
		} else if (batchEvents.length > 0 && pendingCount > 0) {
			setCurrentStep(2);
		} else if (pendingCount > 0) {
			setCurrentStep(1);
		} else {
			setCurrentStep(0);
		}
	}, [selectedMode, receipts, events]);

	// Restore persisted demo state on mount
	useEffect(() => {
		const persistedMode = getPersistedDemoMode();
		if (persistedMode && isDemoMode()) {
			setSelectedMode(persistedMode);
		}
		// Fetch current server mode
		getServerMode().then((mode) => {
			if (mode) setServerModeState(mode);
		});
	}, []);

	const selectScenario = async (mode: DemoMode) => {
		if (selectedMode === mode) {
			return;
		}
		setLoading(true);
		setError(null);

		try {
			// Only clear data when switching to a DIFFERENT scenario
			if (selectedMode !== null) {
				await db.receipts.clear();
				useEventStore.getState().clearEvents();
			}

			await setServerMode(mode);

			setSelectedMode(mode);
			setPersistedDemoMode(mode); // Persist selection
			setServerModeState(mode);
			setCurrentStep(0);
			setDemoMode(true);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	};

	const resetDemo = async () => {
		await db.receipts.clear();
		useEventStore.getState().clearEvents();
		setSelectedMode(null);
		setCurrentStep(0);
		setError(null);
		clearDemoPersistence(); // Clear persisted state
	};

	const commitBatch = async () => {
		setLoading(true);
		setError(null);

		try {
			await demoCommitBatch();
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	};

	const handleToggleDemo = (enabled: boolean) => {
		setDemoMode(enabled);
		setDemoActive(enabled);
		if (!enabled) {
			setSelectedMode(null);
			setServerModeState(null);
			clearDemoPersistence();
		}
	};

	const selectedScenario = SCENARIOS.find((s) => s.id === selectedMode);
	const fraudStep =
		selectedMode === "non-inclusion" || selectedMode === "fraudulent-inclusion"
			? 3
			: undefined;

	return (
		<div className="container mx-auto space-y-6 px-4 py-8">
			<DemoHeader
				serverMode={serverModeState}
				isDemoActive={demoActive}
				onToggleDemo={handleToggleDemo}
			/>

			{error && (
				<Card className="border-red-500/50 bg-red-500/10">
					<CardContent className="py-4 text-red-500 text-sm">
						{error}
					</CardContent>
				</Card>
			)}

			{!selectedMode ? (
				<div className="grid gap-4 md:grid-cols-3">
					{SCENARIOS.map((scenario) => (
						<ScenarioCard
							key={scenario.id}
							scenario={scenario}
							loading={loading}
							onSelect={selectScenario}
						/>
					))}
				</div>
			) : (
				<ActiveScenarioView
					scenario={selectedScenario!}
					currentStep={currentStep}
					fraudStep={fraudStep}
					selectedMode={selectedMode}
					loading={loading}
					receipts={receipts}
					events={events}
					onReset={resetDemo}
					onCommitBatch={commitBatch}
				/>
			)}
		</div>
	);
}
