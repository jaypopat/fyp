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
import { ModelBatchesCard } from "@/components/model";
import { ModelDashboardHeader } from "@/components/model/model-dashboard-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuditActions, useClipboard } from "@/hooks";
import { db } from "@/lib/db";
import { useEventStore } from "@/lib/event-store";
import { predict } from "@/lib/inference";
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
		<div className="container mx-auto space-y-4 px-4 py-6">
			{/* Back Link */}
			<Button variant="ghost" size="sm" className="-ml-2" asChild>
				<Link to="/" className="inline-flex items-center gap-2">
					<ArrowLeft className="h-4 w-4" />
					<span>Back to models</span>
				</Link>
			</Button>

			<ModelDashboardHeader
				model={model}
				batchCount={batches?.length ?? 0}
				onCopy={(value) => handleCopy("hash", value)}
				copiedField={copiedField === "hash" ? model.weightsHash : null}
			/>

			<div className="grid gap-4 lg:grid-cols-5">
				<Card className="lg:col-span-2">
					<CardHeader className="pb-3">
						<div className="flex min-h-[2rem] items-center justify-between">
							<CardTitle className="font-semibold text-base leading-8">
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
											CSV
										</>
									) : (
										<>
											<ChevronDown className="h-3 w-3" />
											Form
										</>
									)}
								</Button>
							)}
						</div>
					</CardHeader>
					<CardContent className="space-y-3">
						{hasGuidedForm && showGuidedForm ? (
							<AdultIncomeForm
								onSubmit={handleInference}
								loading={loading}
								result={result}
							/>
						) : (
							<>
								<input
									className="w-full rounded border bg-background px-3 py-2 text-sm"
									placeholder="e.g. 39, 7, 77516, 9, ..."
									value={inputCSV}
									onChange={(e) => setInputCSV(e.target.value)}
								/>
								{result && (
									<div className="rounded-lg border bg-muted/50 p-3">
										<div className="flex items-center justify-between">
											<span className="text-muted-foreground text-xs">
												Prediction
											</span>
											<Badge
												variant={
													result.prediction === 1 ? "default" : "secondary"
												}
											>
												{result.prediction === 1 ? ">50K" : "≤50K"}
											</Badge>
										</div>
										<p className="mt-1 font-mono text-muted-foreground text-xs">
											Receipt #{result.seqNum}
										</p>
									</div>
								)}
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
										if (!values.length || values.some((x) => Number.isNaN(x))) {
											alert("Provide valid numeric input");
											return;
										}
										handleInference(values);
									}}
								>
									{loading ? "Predicting…" : "Predict"}
								</Button>
							</>
						)}
					</CardContent>
				</Card>

				{/* Batch History */}
				<Card className="lg:col-span-3">
					<CardHeader className="pb-3">
						<div className="flex min-h-[2rem] items-center justify-between">
							<CardTitle className="flex items-center gap-2 font-semibold text-base leading-8">
								<Shield className="h-4 w-4" />
								Batch History
								{auditEvents.length > 0 && (
									<Badge variant="secondary" className="ml-1 gap-1 text-xs">
										<Radio className="h-3 w-3 animate-pulse text-blue-500" />
										{auditEvents.length} live
									</Badge>
								)}
							</CardTitle>
							{userSeqNums.size > 0 && (
								<Badge variant="outline" className="text-xs">
									{userSeqNums.size} yours
								</Badge>
							)}
						</div>
					</CardHeader>
					<CardContent className="pt-0">
						{batches && batches.length > 0 ? (
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
						) : (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<Shield className="h-8 w-8 text-muted-foreground/50" />
								<p className="mt-2 text-muted-foreground text-sm">
									No batches yet
								</p>
								<p className="text-muted-foreground/70 text-xs">
									Batches appear after provider commits queries
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
