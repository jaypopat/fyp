import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import {
	AlertCircle,
	History,
	Loader2,
	Radio,
	RefreshCw,
	XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Hex } from "viem";
import {
	DisputeDialog,
	type DisputeState,
	ReceiptStats,
	ReceiptsTable,
} from "@/components/receipts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { db, type SentinelReceipt } from "@/lib/db";
import { useEventStore } from "@/lib/event-store";
import {
	type VerificationResult,
	verifyAndUpdateReceipt,
} from "@/lib/sentinel";

export const Route = createFileRoute("/receipts")({
	component: ReceiptsPage,
});

function ReceiptsPage() {
	const receipts = useLiveQuery(() =>
		db.receipts.orderBy("timestamp").reverse().toArray(),
	);
	const [checking, setChecking] = useState<number | null>(null);
	const [checkingAll, setCheckingAll] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [dispute, setDispute] = useState<DisputeState>(null);
	const hasAutoChecked = useRef(false);

	const events = useEventStore((state) => state.events);
	const batchEvents = events.filter((e) => e.type === "BATCH_COMMITTED");
	const isListening = useEventStore((state) => state.isInitialized);

	const checkReceipt = async (receipt: SentinelReceipt) => {
		setChecking(receipt.seqNum);
		setError(null);
		try {
			await verifyAndUpdateReceipt(receipt);
		} catch (err) {
			setError(`Failed to check receipt: ${(err as Error).message}`);
		} finally {
			setChecking(null);
		}
	};

	const openDispute = (receipt: SentinelReceipt) => {
		if (!receipt.fraudType) return;

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

	const clearAllReceipts = async () => {
		if (
			window.confirm(
				"Clear all receipts from local storage? This cannot be undone.",
			)
		) {
			await db.receipts.clear();
			setError(null);
		}
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

	const pendingCount =
		receipts?.filter(
			(r: SentinelReceipt) => r.status === "PENDING" || r.status === "BATCHED",
		).length ?? 0;

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
							<CardDescription className="flex items-center gap-2">
								<span>Your inference queries with cryptographic receipts.</span>
								{isListening && (
									<Badge variant="outline" className="gap-1 text-green-600">
										<Radio className="h-3 w-3 animate-pulse" />
										Live
									</Badge>
								)}
							</CardDescription>
						</div>
						<div className="flex items-center gap-2">
							<Button asChild variant="outline" size="sm">
								<Link to="/activity" className="gap-2">
									{batchEvents.length} Batches
								</Link>
							</Button>
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
							<Button
								variant="ghost"
								size="sm"
								onClick={clearAllReceipts}
								className="text-muted-foreground hover:text-destructive"
								title="Dev helper: Clear all receipts from local storage"
							>
								<XCircle className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{error && (
						<div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm">
							<div className="flex items-center gap-2">
								<AlertCircle className="h-4 w-4" />
								{error}
							</div>
						</div>
					)}

					<ReceiptStats receipts={receipts ?? []} />

					<div className="mt-6">
						<ReceiptsTable
							receipts={receipts}
							checking={checking}
							onCheck={checkReceipt}
							onDispute={openDispute}
						/>
					</div>
				</CardContent>
			</Card>

			<DisputeDialog dispute={dispute} onClose={() => setDispute(null)} />
		</div>
	);
}
