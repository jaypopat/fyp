import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Hash } from "viem";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { config } from "@/config";
import { predict } from "@/lib/inference";
import { getModelStatusBadge } from "@/lib/model-status";
import { createSDK } from "@/lib/sdk";
import {
	normalizeModel,
	type SDKModel,
	type SDKModelRaw,
} from "@/lib/sdk-types";

export const Route = createFileRoute("/model/$modelId")({
	loader: async ({ params }) => {
		const modelId = params.modelId;
		if (!modelId?.startsWith("0x")) {
			throw new Error("Model ID must be a 0x-prefixed hash");
		}

		const sdk = createSDK();
		const model = (await sdk.model.get(modelId as Hash)) as SDKModelRaw;
		const normalized = normalizeModel(model);

		return { model: normalized } satisfies { model: SDKModel };
	},
	component: ModelDetailComponent,
});

function ModelDetailComponent() {
	const { modelId = "" } = Route.useParams();
	const { model } = Route.useLoaderData() as { model: SDKModel };
	const [copiedField, setCopiedField] = useState<string | null>(null);
	const resetTimerRef = useRef<number | null>(null);

	// Simple inference UI state
	const [inputCSV, setInputCSV] = useState("");
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<{
		prediction: number;
		verified: boolean;
		queryId: string;
	} | null>(null);

	useEffect(() => {
		return () => {
			if (resetTimerRef.current) {
				window.clearTimeout(resetTimerRef.current);
			}
		};
	}, []);

	if (!model) {
		return (
			<div className="container mx-auto px-4 py-8">
				<h1 className="font-bold text-2xl">Model Not Found</h1>
				<p className="text-muted-foreground">
					We couldn't find a model for the requested identifier.
				</p>
			</div>
		);
	}

	const registrationLabel = new Date(
		model.registrationTimestamp * 1000,
	).toLocaleString();
	const verificationLabel = model.verificationTimestamp
		? new Date(model.verificationTimestamp * 1000).toLocaleString()
		: "Not verified";
	const proofHashValue =
		model.proofHash === "0x" || model.proofHash === "0x0"
			? undefined
			: model.proofHash;

	const handleCopy = async (field: string, value: string) => {
		try {
			await navigator.clipboard.writeText(value);
			setCopiedField(field);
			if (resetTimerRef.current) {
				window.clearTimeout(resetTimerRef.current);
			}
			resetTimerRef.current = window.setTimeout(() => {
				setCopiedField(null);
			}, 1500);
		} catch (error) {
			console.error(`Failed to copy ${field}`, error);
		}
	};

	return (
		<div className="container mx-auto space-y-6 px-4 py-8">
			<Card>
				<CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div className="space-y-3">
						<Button variant="ghost" size="sm" className="w-fit" asChild>
							<Link to="/" className="inline-flex items-center gap-2">
								<ArrowLeft className="h-4 w-4" />
								<span>Back to models</span>
							</Link>
						</Button>
						<CardTitle className="font-semibold text-3xl text-foreground leading-tight">
							{model.name}
						</CardTitle>
						<CardDescription className="space-y-1">
							<span className="text-muted-foreground text-sm">
								Registered by{" "}
								{config.explorerBase ? (
									<a
										href={`${config.explorerBase}/address/${model.author}`}
										target="_blank"
										rel="noreferrer"
										className="underline-offset-4 hover:underline"
										title="View author on explorer"
									>
										<code className="rounded bg-muted px-2 py-1 text-sm">
											{model.author}
										</code>
									</a>
								) : (
									<code className="rounded bg-muted px-2 py-1 text-sm">
										{model.author}
									</code>
								)}
							</span>
							<span className="block text-muted-foreground text-sm">
								Model ID: {modelId}
							</span>
						</CardDescription>
					</div>
					<div className="shrink-0">{getModelStatusBadge(model.status)}</div>
				</CardHeader>
				<CardContent className="text-muted-foreground text-sm">
					{model.description || "No description provided."}
				</CardContent>
			</Card>

			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="font-semibold text-foreground text-lg">
							Model Metadata
						</CardTitle>
						<CardDescription>Hashes and dataset commitments</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<HashField
							label="Weights Hash"
							value={model.weightsHash}
							copied={copiedField === "Weights Hash"}
							onCopy={(value) => handleCopy("Weights Hash", value)}
						/>
						<HashField
							label="Dataset Root"
							value={model.datasetMerkleRoot}
							copied={copiedField === "Dataset Root"}
							onCopy={(value) => handleCopy("Dataset Root", value)}
						/>
						<HashField
							label="Proof Hash"
							value={proofHashValue}
							copied={copiedField === "Proof Hash"}
							onCopy={(value) => handleCopy("Proof Hash", value)}
							fallback="Not available"
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="font-semibold text-foreground text-lg">
							Lifecycle
						</CardTitle>
						<CardDescription>
							Key registration and verification milestones
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<LifecycleRow label="Registered" value={registrationLabel} />
						<LifecycleRow
							label="Verification"
							value={verificationLabel}
							muted={!model.verificationTimestamp}
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="font-semibold text-foreground text-lg">
							Try Inference
						</CardTitle>
						<CardDescription>
							Enter comma-separated numbers matching the model input schema.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<input
							className="w-full rounded border px-3 py-2 text-sm"
							placeholder="e.g. 39, 7, 77516, 9, 2174, 0, 40, 1, ..."
							value={inputCSV}
							onChange={(e) => setInputCSV(e.target.value)}
						/>
						<Button
							disabled={loading}
							onClick={async () => {
								setLoading(true);
								setResult(null);
								try {
									const values = inputCSV
										.split(",")
										.map((v) => v.trim())
										.filter((v) => v.length > 0)
										.map((v) => Number(v));
									if (!values.length || values.some((x) => Number.isNaN(x))) {
										throw new Error("Provide valid numeric input");
									}
									const providerUrl = config.providerUrl; // auto-selects local vs prod
									const resultData = await predict({
										providerUrl,
										modelId,
										input: values,
									});
									setResult({
										prediction: resultData.prediction,
										verified: resultData.verified,
										queryId: resultData.queryId,
									});
								} catch (err) {
									console.error(err);
									setResult(null);
								} finally {
									setLoading(false);
								}
							}}
						>
							{loading ? "Predicting…" : "Predict"}
						</Button>
						{result && (
							<div className="text-foreground text-sm">
								<p>
									Prediction: <b>{result.prediction}</b>
								</p>
								<p>
									Verified:{" "}
									<b
										className={
											result.verified ? "text-green-600" : "text-red-600"
										}
									>
										{String(result.verified)}
									</b>
								</p>
								<p>
									Query ID:{" "}
									<code className="rounded bg-muted px-1 py-0.5">
										{result.queryId}
									</code>
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function formatHash(value?: string, fallback = "—") {
	if (!value) return fallback;
	return value.length > 20 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
}

type HashFieldProps = {
	label: string;
	value?: string;
	copied: boolean;
	onCopy?: (value: string) => void;
	fallback?: string;
	href?: string;
};

function HashField({
	label,
	value,
	copied,
	onCopy,
	fallback = "—",
	href,
}: HashFieldProps) {
	return (
		<div className="space-y-1">
			<p className="text-muted-foreground text-sm">{label}</p>
			<div className="flex items-center gap-2">
				{href && value ? (
					<a
						href={href}
						target="_blank"
						rel="noreferrer"
						className="underline-offset-4 hover:underline"
						title={`Open ${label} on explorer`}
					>
						<code
							title={value}
							className="break-all rounded bg-muted px-2 py-1 text-xs md:text-sm"
						>
							{formatHash(value, fallback)}
						</code>
					</a>
				) : (
					<code
						title={value}
						className="break-all rounded bg-muted px-2 py-1 text-xs md:text-sm"
					>
						{formatHash(value, fallback)}
					</code>
				)}
				{value && onCopy ? (
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={() => onCopy(value)}
						aria-label={`Copy ${label}`}
					>
						{copied ? (
							<Check className="h-4 w-4" />
						) : (
							<Copy className="h-4 w-4" />
						)}
					</Button>
				) : null}
			</div>
		</div>
	);
}

type LifecycleRowProps = {
	label: string;
	value: string;
	muted?: boolean;
};

function LifecycleRow({ label, value, muted = false }: LifecycleRowProps) {
	return (
		<div className="space-y-1">
			<p className="text-muted-foreground text-sm">{label}</p>
			<p
				className={`${muted ? "text-muted-foreground" : "text-foreground"} text-sm`}
			>
				{value}
			</p>
		</div>
	);
}
