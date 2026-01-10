import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	ChevronDown,
	ChevronUp,
	Loader2,
	Radio,
	Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Hash } from "viem";
import { AdultIncomeForm } from "@/components/adult-income-form";
import {
	ModelBatchesCard,
	ModelLifecycleCard,
	ModelMetadataCard,
} from "@/components/model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { config } from "@/config";
import { useAuditActions, useClipboard } from "@/hooks";
import { db } from "@/lib/db";
import { useEventStore } from "@/lib/event-store";
import { predict } from "@/lib/inference";
import { getModelStatusBadge } from "@/lib/model-status";
import { useModelBatches } from "@/lib/use-model-batches";
import { useModelDetail } from "@/lib/use-model-detail";

export const Route = createFileRoute("/model/$modelId")({
	component: ModelDetailPage,
});

function ModelDetailPage() {
	const { modelId = "" } = Route.useParams();
	const { model, isLoading: modelLoading } = useModelDetail(modelId as Hash);
	const { batches, isLoading: batchesLoading } = useModelBatches(
		modelId as Hash,
	);

	// Event store for real-time updates
	const events = useEventStore((s) => s.events);
	const auditEvents = events.filter(
		(e) => e.type === "AUDIT_REQUESTED" || e.type === "AUDIT_PROOF_SUBMITTED",
	);

	// Clipboard hook
	const { copy: handleCopy, copiedField } = useClipboard();

	// Track user's receipts for this model to highlight relevant batches
	const [userSeqNums, setUserSeqNums] = useState<Set<number>>(new Set());

	useEffect(() => {
		db.receipts
			.where("modelId")
			.equals(modelId)
			.toArray()
			.then((receipts) => {
				setUserSeqNums(new Set(receipts.map((r) => r.seqNum)));
			});
	}, [modelId]);

	// Inference UI state
	const [inputCSV, setInputCSV] = useState("");
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<{
		prediction: number;
		seqNum: number;
	} | null>(null);
	const [showGuidedForm, setShowGuidedForm] = useState(true);

	const hasGuidedForm =
		model?.name?.toLowerCase().includes("adult") ||
		model?.name?.toLowerCase().includes("income");

	// Audit actions
	const {
		handleChallenge,
		handleClaimExpiredAudit,
		challengingBatch,
		claimingAudit,
		isPending,
		isConfirming,
	} = useAuditActions();

	const handleInference = async (input: number[]) => {
		setLoading(true);
		setResult(null);
		try {
			const providerUrl = model!.inferenceUrl;
			const resultData = await predict({
				providerUrl,
				modelHash: modelId,
				input,
			});
			setResult({
				prediction: resultData.prediction,
				seqNum: resultData.receipt.seqNum,
			});
		} catch (err) {
			console.error(err);
			setResult(null);
		} finally {
			setLoading(false);
		}
	};

	if (modelLoading || !model) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="flex flex-col items-center gap-4 py-16">
					<Loader2 className="h-12 w-12 animate-spin text-main" />
					<p className="text-foreground/70">Loading model details...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto space-y-6 px-4 py-8">
			{/* Header Card */}
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

			{/* Main Grid - Metadata + Lifecycle + Inference */}
			<div className="grid gap-4 lg:grid-cols-3">
				<ModelMetadataCard
					model={model}
					copiedField={copiedField}
					onCopy={handleCopy}
				/>

				<ModelLifecycleCard model={model} />

				<Card className="flex flex-col">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="font-semibold text-base">
								Try Inference
							</CardTitle>
							{hasGuidedForm && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setShowGuidedForm(!showGuidedForm)}
									className="h-8 gap-1 text-xs"
								>
									{showGuidedForm ? (
										<>
											<ChevronUp className="h-3 w-3" />
											Simple
										</>
									) : (
										<>
											<ChevronDown className="h-3 w-3" />
											Guided
										</>
									)}
								</Button>
							)}
						</div>
					</CardHeader>
					<CardContent className="flex flex-1 flex-col space-y-3">
						{hasGuidedForm && showGuidedForm ? (
							<AdultIncomeForm
								onSubmit={handleInference}
								loading={loading}
								result={result}
							/>
						) : (
							<>
								<input
									className="w-full rounded border px-3 py-2 text-sm"
									placeholder="e.g. 39, 7, 77516, 9, ..."
									value={inputCSV}
									onChange={(e) => setInputCSV(e.target.value)}
								/>
								{result && (
									<div className="rounded bg-muted p-3 text-xs">
										<p>
											<span className="font-medium">Prediction:</span>{" "}
											<b>{result.prediction === 1 ? ">50K" : "≤50K"}</b>
										</p>
										<p>
											<span className="font-medium">Receipt:</span>{" "}
											<code className="text-xs">#{result.seqNum}</code>
										</p>
									</div>
								)}
								<div className="mt-auto">
									<Button
										disabled={loading}
										className="w-full"
										size="sm"
										onClick={() => {
											const values = inputCSV
												.split(",")
												.map((v) => v.trim())
												.filter((v) => v.length > 0)
												.map((v) => Number(v));
											if (
												!values.length ||
												values.some((x) => Number.isNaN(x))
											) {
												alert("Provide valid numeric input");
												return;
											}
											handleInference(values);
										}}
									>
										{loading ? "Predicting…" : "Predict"}
									</Button>
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Batch History with Audit Events Badge */}
			{batches && batches.length > 0 && (
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2 font-semibold text-base">
								<Shield className="h-4 w-4" />
								Batch Commitments ({batches.length})
								{auditEvents.length > 0 && (
									<Badge variant="secondary" className="ml-2 gap-1 text-xs">
										<Radio className="h-3 w-3 animate-pulse text-blue-500" />
										{auditEvents.length} audit event
										{auditEvents.length !== 1 ? "s" : ""}
									</Badge>
								)}
							</CardTitle>
							{userSeqNums.size > 0 && (
								<Badge variant="outline" className="text-xs">
									{userSeqNums.size} of your queries
								</Badge>
							)}
						</div>
						<CardDescription className="text-xs">
							Provider-committed query batches. Challenge any batch to verify
							fairness.
						</CardDescription>
					</CardHeader>
					<CardContent className="pt-0">
						<ModelBatchesCard
							batches={batches}
							isLoading={batchesLoading}
							userSeqNums={userSeqNums}
							onChallenge={handleChallenge}
							onClaimExpiredAudit={handleClaimExpiredAudit}
							challengingBatch={challengingBatch}
							claimingAudit={claimingAudit}
							isPending={isPending}
							isConfirming={isConfirming}
						/>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
