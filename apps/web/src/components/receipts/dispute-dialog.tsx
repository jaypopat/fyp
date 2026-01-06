import { zkFairAbi } from "@zkfair/contracts/abi";
import { AlertTriangle, Gavel, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import type { Hex } from "viem";
import { parseEther } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { config } from "@/config";
import { DISPUTE_STAKE } from "@/lib/constants";
import { db, type SentinelReceipt } from "@/lib/db";
import { hashRecordLeaf } from "@/lib/hash";
import type { VerificationResult } from "@/lib/sentinel";

export type DisputeState = {
	receipt: SentinelReceipt;
	result: VerificationResult;
	type: "NON_INCLUSION" | "FRAUDULENT_INCLUSION";
	batchId?: bigint;
} | null;

interface DisputeDialogProps {
	dispute: DisputeState;
	onClose: () => void;
}

export function DisputeDialog({ dispute, onClose }: DisputeDialogProps) {
	const { writeContract, data: hash, isPending, reset } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
		hash,
	});

	useEffect(() => {
		reset();
	}, [dispute?.receipt?.id, reset]);

	useEffect(() => {
		if (!isSuccess || !hash || !dispute?.receipt.id) return;

		db.receipts.update(dispute.receipt.id, {
			status: "DISPUTED",
			disputeTxHash: hash,
		});

		toast.success("Dispute Successful! 🎉", {
			description:
				"Provider stake slashed! You received your stake back plus the provider's slashed stake.",
			duration: 6000,
		});
	}, [isSuccess, hash, dispute?.receipt?.id]);

	const handleDispute = async () => {
		if (!dispute) return;

		const { receipt, type, batchId } = dispute;

		if (receipt.status === "DISPUTED") {
			toast.error("This receipt has already been disputed.");
			return;
		}

		const disputeStake = parseEther(DISPUTE_STAKE);

		const onError = (error: Error) => {
			const shortMsg =
				(error as Error & { shortMessage?: string }).shortMessage ||
				error.message;
			toast.error("Dispute Failed", {
				description: shortMsg.slice(0, 100),
				duration: 5000,
			});
		};

		if (type === "NON_INCLUSION") {
			writeContract(
				{
					address: config.contractAddress as Hex,
					abi: zkFairAbi,
					functionName: "disputeNonInclusion",
					args: [
						BigInt(receipt.modelId),
						BigInt(receipt.seqNum),
						BigInt(Math.floor(receipt.timestamp / 1000)), // Convert ms to seconds
						(receipt.featuresHash || "0x") as Hex,
						BigInt(receipt.sensitiveAttr),
						BigInt(Math.round(receipt.prediction * 1e6)),
						receipt.providerSignature as Hex,
					],
					value: disputeStake,
				},
				{ onError },
			);
		} else if (type === "FRAUDULENT_INCLUSION" && batchId !== undefined) {
			try {
				// Fetch the Merkle proof from provider
				const proofUrl = `${receipt.providerUrl}/proof/${receipt.seqNum}`;
				console.log("[Dispute] Proof URL:", proofUrl);

				const proofRes = await fetch(proofUrl);

				if (!proofRes.ok) {
					toast.error("Failed to fetch proof", {
						description: "Could not retrieve Merkle proof from provider",
					});
					return;
				}

				const proofData = await proofRes.json();
				console.log("[Dispute] Received proof data:", proofData);

				const proof = proofData.proof as {
					siblings: { sibling: string; position: "left" | "right" }[];
				};

				// Convert proof to contract format
				const merkleProof = proof.siblings.map((p) => `0x${p.sibling}` as Hex);
				const proofPositions = proof.siblings.map((p) =>
					p.position === "left" ? 0 : 1,
				);

				// Compute our leaf hash (what we have locally)
				const leafHashHex = hashRecordLeaf({
					seqNum: receipt.seqNum,
					modelId: receipt.modelId,
					features: receipt.features,
					sensitiveAttr: receipt.sensitiveAttr,
					prediction: receipt.prediction,
					timestamp: receipt.timestamp,
				});
				const leafHash = `0x${leafHashHex}` as Hex;

				console.log("[Dispute] Submitting fraudulent inclusion dispute", {
					batchId,
					seqNum: receipt.seqNum,
					leafHash,
					proofLength: merkleProof.length,
				});

				writeContract(
					{
						address: config.contractAddress as Hex,
						abi: zkFairAbi,
						functionName: "disputeFraudulentInclusion",
						args: [
							batchId,
							BigInt(receipt.seqNum),
							leafHash,
							merkleProof,
							proofPositions,
						],
						value: disputeStake,
					},
					{ onError },
				);
			} catch (error) {
				toast.error("Dispute Preparation Failed", {
					description: (error as Error).message,
				});
			}
		}
	};

	return (
		<Dialog open={!!dispute} onOpenChange={() => onClose()}>
			{dispute && (
				<DialogContent className="max-h-[90vh] overflow-y-auto">
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

					<div className="space-y-4 overflow-x-hidden">
						<DisputeDetails dispute={dispute} />

						<div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
							<p className="font-medium text-yellow-600">What happens next?</p>
							<p className="mt-1 text-muted-foreground">
								The smart contract will verify your dispute. If valid, the
								provider's stake will be slashed and transferred to you as
								compensation.
							</p>
						</div>

						{isSuccess && (
							<div className="rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-green-600 text-sm">
								<p className="font-medium">Dispute submitted successfully!</p>
								<p className="mt-1 break-all font-mono text-xs">
									Transaction: {hash}
								</p>
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
			)}
		</Dialog>
	);
}

function DisputeDetails({ dispute }: { dispute: NonNullable<DisputeState> }) {
	return (
		<div className="space-y-2 rounded-lg bg-muted p-4">
			<div className="flex justify-between gap-4 text-sm">
				<span className="text-muted-foreground">Sequence #</span>
				<span className="font-mono">{dispute.receipt.seqNum}</span>
			</div>
			<div className="flex justify-between gap-4 text-sm">
				<span className="text-muted-foreground">Model ID</span>
				<span>{dispute.receipt.modelId}</span>
			</div>
			<div className="flex justify-between gap-4 text-sm">
				<span className="text-muted-foreground">Dispute Type</span>
				<Badge variant="destructive">
					{dispute.type === "NON_INCLUSION"
						? "Non-Inclusion"
						: "Fraudulent Inclusion"}
				</Badge>
			</div>
			{dispute.batchId && (
				<div className="flex justify-between gap-4 text-sm">
					<span className="shrink-0 text-muted-foreground">Batch ID</span>
					<span className="break-all text-right font-mono">
						{dispute.batchId.toString()}
					</span>
				</div>
			)}
		</div>
	);
}
