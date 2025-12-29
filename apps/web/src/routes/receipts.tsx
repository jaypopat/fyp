import { createFileRoute } from "@tanstack/react-router";
import { zkFairAbi } from "@zkfair/contracts/abi";
import { hashRecordLeaf } from "@zkfair/sdk/browser";
import { useLiveQuery } from "dexie-react-hooks";
import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	Clock,
	Gavel,
	History,
	Loader2,
	RefreshCw,
	Scale,
	Shield,
	XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type Hex, parseEther } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { config } from "@/config";
import { db, type SentinelReceipt } from "@/lib/db";
import {
	type VerificationResult,
	verifyAndUpdateReceipt,
} from "@/lib/sentinel";

export const Route = createFileRoute("/receipts")({
	component: ReceiptsPage,
});

// ============================================
// DISPUTE DIALOG
// ============================================

type DisputeState = {
	receipt: SentinelReceipt;
	result: VerificationResult;
	type: "NON_INCLUSION" | "FRAUDULENT_INCLUSION";
	batchId?: bigint;
} | null;

function DisputeDialog({
	dispute,
	onClose,
}: {
	dispute: DisputeState;
	onClose: () => void;
}) {
	const { writeContract, data: hash, isPending, error } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
		hash,
	});

	if (!dispute) return null;

	const handleDispute = async () => {
		const { receipt, type, batchId } = dispute;
		// DISPUTE_STAKE = 0.0001 ETH (matches contract constant)
		const disputeStake = parseEther("0.0001");

		if (type === "NON_INCLUSION") {
			// Type A: Non-inclusion fraud
			writeContract({
				address: config.contractAddress as Hex,
				abi: zkFairAbi,
				functionName: "disputeNonInclusion",
				args: [
					BigInt(receipt.modelId),
					BigInt(receipt.seqNum),
					BigInt(receipt.timestamp),
					(receipt.featuresHash || "0x") as Hex,
					BigInt(receipt.sensitiveAttr),
					BigInt(Math.round(receipt.prediction * 1e6)),
					receipt.providerSignature as Hex,
				],
				value: disputeStake,
			});
		} else if (type === "FRAUDULENT_INCLUSION" && batchId !== undefined) {
			// Type B: Fraudulent inclusion (invalid proof)
			// Compute the leaf hash from receipt data
			const leafHashHex = hashRecordLeaf({
				seqNum: receipt.seqNum,
				modelId: receipt.modelId,
				features: receipt.features,
				sensitiveAttr: receipt.sensitiveAttr,
				prediction: receipt.prediction,
				timestamp: receipt.timestamp,
			});
			const leafHash = `0x${leafHashHex}` as Hex;

			writeContract({
				address: config.contractAddress as Hex,
				abi: zkFairAbi,
				functionName: "disputeFraudulentInclusion",
				args: [
					batchId,
					BigInt(receipt.seqNum),
					leafHash,
					[], // empty proof = invalid proof = fraud
					[], // empty positions
				],
				value: disputeStake,
			});
		}
	};

	// Update DB when dispute succeeds
	useEffect(() => {
		if (isSuccess && hash && dispute) {
			db.receipts.update(dispute.receipt.id!, {
				status: "DISPUTED",
				disputeTxHash: hash,
			});
		}
	}, [isSuccess, hash, dispute]);

	return (
		<Dialog open={!!dispute} onOpenChange={() => onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-destructive">
						<AlertTriangle className="h-5 w-5" />
						Submit Fraud Dispute
					</DialogTitle>
					<DialogDescription>
						{dispute.type === "NON_INCLUSION"
							? "The provider failed to batch your query within the required time period."
							: "The provider committed a batch but your query data was tampered with or missing."}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2 rounded-lg bg-muted p-4">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Sequence #</span>
							<span className="font-mono">{dispute.receipt.seqNum}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Model ID</span>
							<span>{dispute.receipt.modelId}</span>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Dispute Type</span>
							<Badge variant="destructive">
								{dispute.type === "NON_INCLUSION"
									? "Non-Inclusion"
									: "Fraudulent Inclusion"}
							</Badge>
						</div>
						{dispute.batchId && (
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Batch ID</span>
								<span className="font-mono">{dispute.batchId.toString()}</span>
							</div>
						)}
					</div>

					<div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
						<p className="font-medium text-yellow-600">What happens next?</p>
						<p className="mt-1 text-muted-foreground">
							The smart contract will verify your dispute. If valid, the
							provider's stake will be slashed and transferred to you as
							compensation.
						</p>
					</div>

					{error && (
						<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm">
							{error.message}
						</div>
					)}

					{isSuccess && (
						<div className="rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-green-600 text-sm">
							Dispute submitted successfully! Transaction: {hash}
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={isPending}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleDispute}
						disabled={isPending || isConfirming || isSuccess}
						className="text-black"
					>
						{isPending || isConfirming ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								{isPending ? "Confirm in Wallet..." : "Confirming..."}
							</>
						) : isSuccess ? (
							"Dispute Submitted"
						) : (
							<>
								<Gavel className="mr-2 h-4 w-4" />
								Submit Dispute
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ============================================
// MAIN PAGE
// ============================================

function ReceiptsPage() {
	const receipts = useLiveQuery(() =>
		db.receipts.orderBy("timestamp").reverse().toArray(),
	);
	const [checking, setChecking] = useState<number | null>(null);
	const [checkingAll, setCheckingAll] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [dispute, setDispute] = useState<DisputeState>(null);
	const hasAutoChecked = useRef(false);

	const checkReceipt = async (receipt: SentinelReceipt) => {
		setChecking(receipt.seqNum);
		setError(null);
		try {
			const result = await verifyAndUpdateReceipt(receipt);

			// Check if fraud detected - dialog will auto-open via openDispute
			if (
				result.status === "FRAUD_NON_INCLUSION" ||
				result.status === "FRAUD_INVALID_PROOF"
			) {
				// Fraud info is now stored in DB, refresh will show dispute button
			}
		} catch (err) {
			setError(`Failed to check receipt: ${(err as Error).message}`);
		} finally {
			setChecking(null);
		}
	};

	// Open dispute dialog using stored fraud info (doesn't re-verify)
	const openDispute = (receipt: SentinelReceipt) => {
		if (!receipt.fraudType) return;

		// Build a minimal VerificationResult from stored data
		const result: VerificationResult =
			receipt.fraudType === "NON_INCLUSION"
				? { status: "FRAUD_NON_INCLUSION", reason: "Query was never batched" }
				: {
						status: "FRAUD_INVALID_PROOF",
						reason: "Merkle proof invalid",
						batch: {
							batchId: BigInt(receipt.fraudBatchId || "0"),
							seqNumStart: 0,
							seqNumEnd: 0,
							merkleRoot: (receipt.batchMerkleRoot || "0x") as Hex,
							committedAt: 0,
						},
					};

		setDispute({
			receipt,
			result,
			type: receipt.fraudType,
			batchId: receipt.fraudBatchId ? BigInt(receipt.fraudBatchId) : undefined,
		});
	};

	const checkAllPending = async (receiptList: SentinelReceipt[]) => {
		setCheckingAll(true);
		setError(null);

		const pending = receiptList.filter(
			(r) => r.status === "PENDING" || r.status === "BATCHED",
		);
		for (const receipt of pending) {
			try {
				await verifyAndUpdateReceipt(receipt);
			} catch {
				// Continue checking others even if one fails
			}
		}

		setCheckingAll(false);
	};

	// Auto-check all pending receipts on page load
	useEffect(() => {
		if (receipts && receipts.length > 0 && !hasAutoChecked.current) {
			hasAutoChecked.current = true;
			const pending = receipts.filter(
				(r: SentinelReceipt) =>
					r.status === "PENDING" || r.status === "BATCHED",
			);
			if (pending.length > 0) {
				checkAllPending(receipts);
			}
		}
	}, [receipts]);

	const getStatusBadge = (status: SentinelReceipt["status"]) => {
		switch (status) {
			case "PENDING":
				return (
					<Badge variant="outline" className="gap-1">
						<Clock className="h-3 w-3" />
						Pending
					</Badge>
				);
			case "BATCHED":
				return (
					<Badge variant="secondary" className="gap-1">
						<Shield className="h-3 w-3" />
						Batched
					</Badge>
				);
			case "COMMITTED":
				return (
					<Badge className="gap-1 bg-blue-500/20 text-blue-600">
						<CheckCircle2 className="h-3 w-3" />
						Committed
					</Badge>
				);
			case "VERIFIED":
				return (
					<Badge className="gap-1 bg-green-500/20 text-green-600">
						<CheckCircle2 className="h-3 w-3" />
						Verified
					</Badge>
				);
			case "FRAUD_DETECTED":
				return (
					<Badge variant="destructive" className="gap-1">
						<XCircle className="h-3 w-3" />
						Fraud Detected
					</Badge>
				);
			case "DISPUTED":
				return (
					<Badge className="gap-1 bg-purple-500/20 text-purple-600">
						<Scale className="h-3 w-3" />
						Disputed
					</Badge>
				);
		}
	};

	// Format prediction as class label
	const formatPrediction = (prediction: number): string => {
		// Binary classification: 0 = <=50K, 1 = >50K
		return prediction >= 0.5 ? ">50K" : "<=50K";
	};

	const pendingCount =
		receipts?.filter(
			(r: SentinelReceipt) => r.status === "PENDING" || r.status === "BATCHED",
		).length ?? 0;
	const verifiedCount =
		receipts?.filter((r: SentinelReceipt) => r.status === "VERIFIED").length ??
		0;
	const fraudCount =
		receipts?.filter((r: SentinelReceipt) => r.status === "FRAUD_DETECTED")
			.length ?? 0;

	return (
		<div className="container mx-auto space-y-6 px-4 py-8">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<History className="h-5 w-5" />
								Query Receipts
							</CardTitle>
							<CardDescription>
								Your inference queries with cryptographic receipts. Check status
								to verify queries are committed on-chain.
							</CardDescription>
						</div>
						{pendingCount > 0 && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => receipts && checkAllPending(receipts)}
								disabled={checkingAll}
								className="gap-2"
							>
								{checkingAll ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<RefreshCw className="h-4 w-4" />
								)}
								Verify {pendingCount} Pending
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{/* Error alert */}
					{error && (
						<div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm">
							<div className="flex items-center gap-2">
								<AlertCircle className="h-4 w-4" />
								{error}
							</div>
						</div>
					)}

					{/* Stats */}
					<div className="mb-6 grid grid-cols-4 gap-4">
						<Card className="p-4">
							<div className="font-bold text-2xl">{receipts?.length ?? 0}</div>
							<div className="text-muted-foreground text-sm">Total Queries</div>
						</Card>
						<Card className="p-4">
							<div className="font-bold text-2xl text-yellow-600">
								{pendingCount}
							</div>
							<div className="text-muted-foreground text-sm">Pending</div>
						</Card>
						<Card className="p-4">
							<div className="font-bold text-2xl text-green-600">
								{verifiedCount}
							</div>
							<div className="text-muted-foreground text-sm">Verified</div>
						</Card>
						<Card className="p-4">
							<div className="font-bold text-2xl text-red-600">
								{fraudCount}
							</div>
							<div className="text-muted-foreground text-sm">
								Fraud Detected
							</div>
						</Card>
					</div>

					{/* Table */}
					{!receipts ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-8 w-8 animate-spin" />
						</div>
					) : receipts.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
							<h3 className="font-semibold text-lg">No receipts yet</h3>
							<p className="text-muted-foreground text-sm">
								Make inference queries to see receipts here
							</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-16">Seq #</TableHead>
										<TableHead>Model</TableHead>
										<TableHead>Prediction</TableHead>
										<TableHead>Time</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="w-32">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{receipts.map((receipt: SentinelReceipt) => (
										<TableRow key={receipt.id}>
											<TableCell className="font-mono text-sm">
												#{receipt.seqNum}
											</TableCell>
											<TableCell>{receipt.modelId}</TableCell>
											<TableCell className="font-mono">
												{formatPrediction(receipt.prediction)}
											</TableCell>
											<TableCell className="text-sm">
												{new Date(receipt.timestamp).toLocaleString(undefined, {
													month: "short",
													day: "numeric",
													hour: "2-digit",
													minute: "2-digit",
												})}
											</TableCell>
											<TableCell>{getStatusBadge(receipt.status)}</TableCell>
											<TableCell>
												<div className="flex items-center gap-1">
													{(receipt.status === "PENDING" ||
														receipt.status === "BATCHED") && (
														<Button
															variant="ghost"
															size="sm"
															onClick={() => checkReceipt(receipt)}
															disabled={checking === receipt.seqNum}
															title="Verify receipt"
														>
															{checking === receipt.seqNum ? (
																<Loader2 className="h-4 w-4 animate-spin" />
															) : (
																<RefreshCw className="h-4 w-4" />
															)}
														</Button>
													)}
													{receipt.status === "FRAUD_DETECTED" &&
														receipt.fraudType && (
															<Button
																variant="destructive"
																size="sm"
																onClick={() => openDispute(receipt)}
																className="gap-1 text-black"
															>
																<Gavel className="h-3 w-3" />
																Dispute
															</Button>
														)}
													{receipt.status === "DISPUTED" &&
														receipt.disputeTxHash && (
															<a
																href={`${config.explorerBase}/tx/${receipt.disputeTxHash}`}
																target="_blank"
																rel="noreferrer"
																className="flex items-center gap-1 text-purple-600 text-xs hover:underline"
															>
																<Scale className="h-3 w-3" />
																Dispute Tx ↗
															</a>
														)}
													{receipt.batchTxHash && (
														<a
															href={`${config.explorerBase}/tx/${receipt.batchTxHash}`}
															target="_blank"
															rel="noreferrer"
															className="text-blue-600 text-xs hover:underline"
														>
															Tx ↗
														</a>
													)}
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Dispute Dialog */}
			<DisputeDialog dispute={dispute} onClose={() => setDispute(null)} />
		</div>
	);
}
