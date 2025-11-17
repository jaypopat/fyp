import { createFileRoute, Link } from "@tanstack/react-router";
import { zkFairAbi } from "@zkfair/contracts/abi";
import {
	AlertCircle,
	ArrowLeft,
	Check,
	Copy,
	Loader2,
	Shield,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Hash } from "viem";
import {
	useAccount,
	useWaitForTransactionReceipt,
	useWriteContract,
} from "wagmi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { config } from "@/config";
import { predict } from "@/lib/inference";
import { getAuditStatusBadge, getModelStatusBadge } from "@/lib/model-status";
import { useModelBatches } from "@/lib/use-model-batches";
import { useModelDetail } from "@/lib/use-model-detail";

export const Route = createFileRoute("/model/$modelId")({
	component: ModelDetailComponent,
});

function ModelDetailComponent() {
	const { modelId = "" } = Route.useParams();

	const { model, isLoading: modelLoading } = useModelDetail(modelId as Hash);
	const { batches, isLoading: batchesLoading } = useModelBatches(
		modelId as Hash,
	);

	const [copiedField, setCopiedField] = useState<string | null>(null);
	const resetTimerRef = useRef<number | null>(null);

	// Simple inference UI state
	const [inputCSV, setInputCSV] = useState("");
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<{
		prediction: number;
		queryId: string;
	} | null>(null);

	// Wallet connection
	const { address } = useAccount();

	// Challenge state
	const [challengingBatch, setChallengingBatch] = useState<string | null>(null);
	const {
		writeContract,
		data: hash,
		isPending,
		error: writeError,
	} = useWriteContract();
	const { isLoading: isConfirming, isSuccess: isConfirmed } =
		useWaitForTransactionReceipt({
			hash,
		});

	useEffect(() => {
		return () => {
			if (resetTimerRef.current) {
				window.clearTimeout(resetTimerRef.current);
			}
		};
	}, []);

	// Handle transaction confirmation
	useEffect(() => {
		if (isConfirmed && challengingBatch) {
			alert(`Challenge submitted for batch ${challengingBatch}!`);
			setChallengingBatch(null);
		}
	}, [isConfirmed, challengingBatch]);

	// Handle transaction errors
	useEffect(() => {
		if (writeError) {
			console.error("Challenge transaction error:", writeError);
			console.error("Error details:", {
				name: writeError.name,
				message: writeError.message,
				cause: writeError.cause,
				details: (writeError as Error & { details?: string }).details,
			});

			// Try to extract more useful error message
			let errorMsg = writeError.message;
			const errWithCause = writeError as Error & {
				cause?: { reason?: string };
				shortMessage?: string;
			};
			if (errWithCause.cause?.reason) {
				errorMsg = errWithCause.cause.reason;
			} else if (errWithCause.shortMessage) {
				errorMsg = errWithCause.shortMessage;
			}

			alert(`Challenge failed: ${errorMsg}`);
			setChallengingBatch(null);
		}
	}, [writeError]);

	// Show loading state while model is loading
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

	const handleChallenge = async (batchId: string) => {
		try {
			setChallengingBatch(batchId);

			console.log("Challenging batch:", batchId);
			console.log("Contract address:", config.contractAddress);
			console.log("Connected account:", address);

			// Use wagmi to write contract with connected wallet
			writeContract({
				address: config.contractAddress as Hash,
				abi: zkFairAbi,
				functionName: "requestAudit",
				args: [BigInt(batchId)],
			});
		} catch (error) {
			console.error("Challenge failed:", error);
			alert(`Challenge failed: ${(error as Error).message}`);
			setChallengingBatch(null);
		}
	};

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

			{/* Main Grid - Metadata + Inference + Lifecycle in 3 columns */}
			<div className="grid gap-4 lg:grid-cols-3">
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="font-semibold text-base">Metadata</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
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
						<div className="space-y-1">
							<p className="text-muted-foreground text-xs">Inference URL</p>
							<a
								href={model.inferenceUrl}
								target="_blank"
								rel="noreferrer"
								className="break-all text-sm underline-offset-4 hover:underline"
							>
								{model.inferenceUrl}
							</a>
						</div>
					</CardContent>
				</Card>

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

				<Card className="flex flex-col">
					<CardHeader className="pb-3">
						<CardTitle className="font-semibold text-base">
							Try Inference{" "}
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-1 flex-col space-y-2">
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
									<b>{result.prediction}</b>
								</p>
								<p className="truncate" title={result.queryId}>
									<span className="font-medium">Query:</span>{" "}
									<code className="text-xs">
										{result.queryId.slice(0, 16)}...
									</code>
								</p>
							</div>
						)}
						<div className="mt-auto">
							<Button
								disabled={loading}
								className="w-full"
								size="sm"
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
										// Use model's configured inference URL instead of static config
										const providerUrl =
											model?.inferenceUrl || config.providerUrl;
										const resultData = await predict({
											providerUrl,
											modelId,
											input: values,
										});
										setResult({
											prediction: resultData.prediction,
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
						</div>
					</CardContent>
				</Card>
			</div>

			{batches.length > 0 && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 font-semibold text-base">
							<Shield className="h-4 w-4" />
							Batch Commitments ({batches.length})
						</CardTitle>
						<CardDescription className="text-xs">
							Provider-committed query batches. Challenge any batch to verify
							fairness.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{batchesLoading ? (
							<div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
								Loading batches...
							</div>
						) : (
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow className="text-xs">
											<TableHead className="w-20">Batch</TableHead>
											<TableHead className="w-24">Queries</TableHead>
											<TableHead>Merkle Root</TableHead>
											<TableHead className="w-40">Committed</TableHead>
											<TableHead className="w-20 text-center">Status</TableHead>
											<TableHead className="w-32">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{batches.map((batch) => (
											<TableRow key={batch.batchId} className="text-xs">
												<TableCell className="font-medium">
													#{batch.batchId}
												</TableCell>
												<TableCell>{batch.queryCount}</TableCell>
												<TableCell>
													<code className="rounded bg-muted px-1.5 py-0.5 text-xs">
														{formatHash(batch.merkleRoot, "—")}
													</code>
												</TableCell>
												<TableCell className="text-xs">
													{new Date(
														Number(batch.committedAt) * 1000,
													).toLocaleString(undefined, {
														month: "short",
														day: "numeric",
														hour: "2-digit",
														minute: "2-digit",
													})}
												</TableCell>
												<TableCell className="text-center">
													{batch.audited ? (
														getAuditStatusBadge(batch.auditStatus)
													) : (
														<Badge variant="outline" className="text-xs">
															Pending
														</Badge>
													)}
												</TableCell>
												<TableCell>
													{!batch.audited ? (
														batch.activeAuditId !== "0" ? (
															<Button
																size="sm"
																variant="secondary"
																disabled
																className="h-7 gap-1 text-xs"
															>
																<AlertCircle className="h-3 w-3" />
																Audit Pending
															</Button>
														) : (
															<Button
																size="sm"
																variant="outline"
																onClick={() => handleChallenge(batch.batchId)}
																disabled={
																	(isPending &&
																		challengingBatch === batch.batchId) ||
																	(isConfirming &&
																		challengingBatch === batch.batchId)
																}
																className="h-7 gap-1 text-xs"
															>
																<AlertCircle className="h-3 w-3" />
																{(isPending || isConfirming) &&
																challengingBatch === batch.batchId
																	? "..."
																	: "Challenge"}
															</Button>
														)
													) : batch.auditStatus === 1 ? (
														<span className="text-green-600 text-xs">
															✓ Verified
														</span>
													) : (
														<a
															href={`${config.explorerBase}/tx/${batch.activeAuditId}`}
															target="_blank"
															rel="noreferrer"
															className="text-blue-600 text-xs underline-offset-4 hover:underline"
														>
															View Audit
														</a>
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>
			)}
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
