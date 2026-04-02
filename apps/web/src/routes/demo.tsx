import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, Shield, XCircle } from "lucide-react";
import { useEffect, useMemo, useReducer } from "react";
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
			"Receipt verified",
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

type DemoState = {
	selectedMode: DemoMode | null;
	serverModeState: DemoMode | null;
	loading: boolean;
	error: string | null;
	demoActive: boolean;
};

type DemoAction =
	| { type: "SELECT_START" }
	| { type: "SELECT_SUCCESS"; mode: DemoMode }
	| { type: "SELECT_ERROR"; error: string }
	| { type: "RESET" }
	| { type: "COMMIT_START" }
	| { type: "COMMIT_ERROR"; error: string }
	| { type: "COMMIT_DONE" }
	| { type: "TOGGLE_DEMO"; enabled: boolean }
	| { type: "RESTORE"; mode: DemoMode }
	| { type: "SET_SERVER_MODE"; mode: DemoMode };

function demoReducer(state: DemoState, action: DemoAction): DemoState {
	switch (action.type) {
		case "SELECT_START":
			return { ...state, loading: true, error: null };
		case "SELECT_SUCCESS":
			return {
				...state,
				selectedMode: action.mode,
				serverModeState: action.mode,
				loading: false,
				demoActive: true,
			};
		case "SELECT_ERROR":
			return { ...state, error: action.error, loading: false };
		case "RESET":
			return { ...state, selectedMode: null, error: null };
		case "COMMIT_START":
			return { ...state, loading: true, error: null };
		case "COMMIT_ERROR":
			return { ...state, error: action.error, loading: false };
		case "COMMIT_DONE":
			return { ...state, loading: false };
		case "TOGGLE_DEMO":
			return action.enabled
				? { ...state, demoActive: true }
				: {
						...state,
						demoActive: false,
						selectedMode: null,
						serverModeState: null,
					};
		case "RESTORE":
			return { ...state, selectedMode: action.mode };
		case "SET_SERVER_MODE":
			return { ...state, serverModeState: action.mode };
	}
}

function DemoPage() {
	const [state, dispatch] = useReducer(demoReducer, undefined, () => ({
		selectedMode: null as DemoMode | null,
		serverModeState: null as DemoMode | null,
		loading: false,
		error: null as string | null,
		demoActive: isDemoMode(),
	}));

	const receipts = useLiveQuery<SentinelReceipt[]>(() => db.receipts.toArray());
	const events = useEventStore((s) => s.events);

	// Derive currentStep from receipts and events instead of cascading setState
	const currentStep = useMemo(() => {
		if (!state.selectedMode || !receipts) return 0;

		const fraudCount = receipts.filter(
			(r) => r.status === "FRAUD_DETECTED",
		).length;
		if (fraudCount > 0) return 3;

		const verifiedCount = receipts.filter(
			(r) => r.status === "VERIFIED",
		).length;
		if (verifiedCount > 0) return 4;

		const pendingCount = receipts.filter((r) => r.status === "PENDING").length;
		const batchEvents = events.filter((e) => e.type === "BATCH_COMMITTED");
		if (batchEvents.length > 0 && pendingCount > 0) return 2;
		if (pendingCount > 0) return 1;
		return 0;
	}, [state.selectedMode, receipts, events]);

	// Restore persisted demo state on mount
	useEffect(() => {
		const persistedMode = getPersistedDemoMode();
		if (persistedMode && isDemoMode()) {
			dispatch({ type: "RESTORE", mode: persistedMode });
		}
		getServerMode().then((mode) => {
			if (mode) dispatch({ type: "SET_SERVER_MODE", mode });
		});
	}, []);

	const selectScenario = async (mode: DemoMode) => {
		if (state.selectedMode === mode) return;
		dispatch({ type: "SELECT_START" });

		try {
			if (state.selectedMode !== null) {
				await db.receipts.clear();
				useEventStore.getState().clearEvents();
			}
			await setServerMode(mode);
			setPersistedDemoMode(mode);
			setDemoMode(true);
			dispatch({ type: "SELECT_SUCCESS", mode });
		} catch (err) {
			dispatch({ type: "SELECT_ERROR", error: (err as Error).message });
		}
	};

	const resetDemo = async () => {
		await db.receipts.clear();
		useEventStore.getState().clearEvents();
		clearDemoPersistence();
		dispatch({ type: "RESET" });
	};

	const commitBatch = async () => {
		dispatch({ type: "COMMIT_START" });
		try {
			await demoCommitBatch();
			dispatch({ type: "COMMIT_DONE" });
		} catch (err) {
			dispatch({ type: "COMMIT_ERROR", error: (err as Error).message });
		}
	};

	const handleToggleDemo = (enabled: boolean) => {
		setDemoMode(enabled);
		if (!enabled) clearDemoPersistence();
		dispatch({ type: "TOGGLE_DEMO", enabled });
	};

	const selectedScenario = SCENARIOS.find((s) => s.id === state.selectedMode);
	const fraudStep =
		state.selectedMode === "non-inclusion" ||
		state.selectedMode === "fraudulent-inclusion"
			? 3
			: undefined;

	return (
		<div className="container mx-auto space-y-6 px-4 py-8">
			<DemoHeader
				serverMode={state.serverModeState}
				isDemoActive={state.demoActive}
				onToggleDemo={handleToggleDemo}
			/>

			{state.error && (
				<Card className="border-red-500/50 bg-red-500/10">
					<CardContent className="py-4 text-red-500 text-sm">
						{state.error}
					</CardContent>
				</Card>
			)}

			{!state.selectedMode ? (
				<div className="grid gap-4 md:grid-cols-3">
					{SCENARIOS.map((scenario) => (
						<ScenarioCard
							key={scenario.id}
							scenario={scenario}
							loading={state.loading}
							onSelect={selectScenario}
						/>
					))}
				</div>
			) : selectedScenario ? (
				<ActiveScenarioView
					scenario={selectedScenario}
					currentStep={currentStep}
					fraudStep={fraudStep}
					selectedMode={state.selectedMode}
					loading={state.loading}
					receipts={receipts}
					events={events}
					onReset={resetDemo}
					onCommitBatch={commitBatch}
				/>
			) : null}
		</div>
	);
}
