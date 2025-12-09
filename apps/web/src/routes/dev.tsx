import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { AdultIncomeForm } from "@/components/adult-income-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/dev")({
	component: DevPage,
});

type Env = "local" | "prod";

const BASE_URLS: Record<Env, string> = {
	local: "http://localhost:5000",
	prod: "https://provider-api.fyp.jaypopat.me",
};

function DevPage() {
	const [env, setEnv] = useState<Env>("prod");
	const baseUrl = BASE_URLS[env];

	const modelIdInputId = useId();
	const predictInputId = useId();

	type Health =
		| { status: string; loadedModels: string[]; timestamp: number }
		| { error: string };
	type Models =
		| { models: { modelId: string; loaded: boolean }[] }
		| { error: string };
	type PredictResponse =
		| {
				modelId: string | number;
				prediction: number;
				timestamp: number;
				inputHash: string;
				queryId: string;
		  }
		| { error: string };

	const [health, setHealth] = useState<Health | null>(null);
	const [models, setModels] = useState<Models | null>(null);
	const [predictInput, setPredictInput] = useState<string>("1,2,3");
	const [predictModelId, setPredictModelId] = useState<string>("adult-income");
	const [predictResult, setPredictResult] = useState<PredictResponse | null>(
		null,
	);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [useGuidedForm, setUseGuidedForm] = useState<boolean>(true);
	const guidedToggleId = useId();
	const [aiVector, setAiVector] = useState<number[] | null>(null);

	function buildAdultIncomeVector(): number[] {
		return aiVector ?? [];
	}

	const doGet = async <T,>(path: string, setter: (v: T) => void) => {
		setError(null);
		try {
			const res = await fetch(`${baseUrl}${path}`);
			const data: T = await res.json();
			setter(data);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Request failed");
		}
	};

	useEffect(() => {
		void doGet<Models>("/models", setModels);
		void doGet<Health>("/health", setHealth);
	}, [baseUrl]);

	const doPredict = async () => {
		setLoading(true);
		setError(null);
		setPredictResult(null);
		try {
			const input =
				useGuidedForm && predictModelId === "adult-income"
					? (() => {
							const vec = buildAdultIncomeVector();
							if (!vec || vec.length === 0) {
								throw new Error("Guided form is empty. Please fill the form.");
							}
							return vec;
						})()
					: predictInput
							.split(",")
							.map((v) => v.trim())
							.filter(Boolean)
							.map((v) => Number(v));

			const res = await fetch(`${baseUrl}/predict`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ modelId: 1, input }),
			});
			const data = await res.json();
			setPredictResult(data);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Predict failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container mx-auto space-y-6 px-4 py-8">
			<div className="flex items-center justify-between">
				<h1 className="font-semibold text-2xl">Provider Dev Tools</h1>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Config</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					<div className="flex flex-wrap items-center gap-3">
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground">Environment:</span>
							<select
								className="rounded border px-2 py-1 text-xs"
								value={env}
								onChange={(e) => setEnv(e.target.value as Env)}
							>
								<option value="local">Local</option>
								<option value="prod">Production</option>
							</select>
						</div>
						<div>
							<span className="text-muted-foreground">Base URL:</span>{" "}
							<code className="rounded bg-muted px-2 py-1">{baseUrl}</code>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-6 md:grid-cols-2">
				{/* GET endpoints */}
				<Card>
					<CardHeader>
						<CardTitle>GET Endpoints</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="flex gap-2">
							<Button onClick={() => doGet<Health>("/health", setHealth)}>
								GET /health
							</Button>
							<Button onClick={() => doGet<Models>("/models", setModels)}>
								GET /models
							</Button>
						</div>
						{health && (
							<div className="text-xs">
								<p className="font-medium">/health</p>
								<pre className="overflow-auto rounded bg-muted p-3">
									{JSON.stringify(health, null, 2)}
								</pre>
							</div>
						)}
						{models && (
							<div className="text-xs">
								<p className="font-medium">/models</p>
								<pre className="overflow-auto rounded bg-muted p-3">
									{JSON.stringify(models, null, 2)}
								</pre>
							</div>
						)}
					</CardContent>
				</Card>

				{/* POST /predict */}
				<Card>
					<CardHeader>
						<CardTitle>POST /predict</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<label className="text-sm" htmlFor={modelIdInputId}>
								Model
							</label>
							<select
								id={modelIdInputId}
								className="w-full rounded border px-3 py-2 text-sm"
								value={predictModelId}
								onChange={(e) => setPredictModelId(e.target.value)}
							>
								{models && "models" in models ? (
									models.models.map((m) => (
										<option key={m.modelId} value={m.modelId}>
											{m.modelId}
										</option>
									))
								) : (
									<option value={predictModelId}>{predictModelId}</option>
								)}
							</select>
						</div>

						<div className="flex items-center gap-2">
							<input
								id={guidedToggleId}
								type="checkbox"
								checked={useGuidedForm && predictModelId === "adult-income"}
								onChange={(e) => setUseGuidedForm(e.target.checked)}
								disabled={predictModelId !== "adult-income"}
							/>
							<label htmlFor={guidedToggleId} className="text-sm">
								Use guided form (Adult Income)
							</label>
						</div>

						{useGuidedForm && predictModelId === "adult-income" ? (
							<AdultIncomeForm
								className="grid"
								onChange={(vec) => setAiVector(vec)}
							/>
						) : (
							<div className="space-y-2">
								<label className="text-sm" htmlFor={predictInputId}>
									Input (comma-separated numbers)
								</label>
								<input
									id={predictInputId}
									className="w-full rounded border px-3 py-2 text-sm"
									value={predictInput}
									onChange={(e) => setPredictInput(e.target.value)}
								/>
							</div>
						)}

						<div className="flex gap-2">
							<Button disabled={loading} onClick={doPredict}>
								{loading ? "Predicting…" : "Send"}
							</Button>
						</div>
						{predictResult && (
							<div className="text-xs">
								<p className="font-medium">Response</p>
								<pre className="overflow-auto rounded bg-muted p-3">
									{JSON.stringify(predictResult, null, 2)}
								</pre>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{error && <div className="text-red-600 text-sm">Error: {error}</div>}
		</div>
	);
}
