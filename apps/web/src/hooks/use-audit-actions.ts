import { zkFairAbi } from "@zkfair/contracts/abi";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Hash } from "viem";
import { parseEther } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { config } from "@/config";
import { AUDIT_STAKE } from "@/lib/constants";

export type ActionType = "challenge" | "claim" | null;

export function useAuditActions() {
	const [challengingBatch, setChallengingBatch] = useState<string | null>(null);
	const [claimingAudit, setClaimingAudit] = useState<string | null>(null);
	const [actionType, setActionType] = useState<ActionType>(null);

	const { writeContract, data: hash, isPending } = useWriteContract();

	const { isLoading: isConfirming, isSuccess: isConfirmed } =
		useWaitForTransactionReceipt({ hash });

	// Handle transaction confirmation
	useEffect(() => {
		if (!isConfirmed) return;

		if (actionType === "challenge" && challengingBatch) {
			toast.success("Audit Challenge Submitted! ⚔️", {
				description: `Batch #${challengingBatch} is now under audit. Provider must submit a valid proof or lose their stake.`,
				duration: 6000,
			});
		} else if (actionType === "claim" && claimingAudit) {
			toast.success("Reward Claimed! 💰", {
				description:
					"Provider failed to respond. You received your stake back plus the provider's slashed stake.",
				duration: 6000,
			});
		}

		setChallengingBatch(null);
		setClaimingAudit(null);
		setActionType(null);
	}, [isConfirmed, challengingBatch, claimingAudit, actionType]);

	const handleChallenge = (batchId: string) => {
		console.log(`[useAuditActions] Challenging batch ${batchId}`);
		setChallengingBatch(batchId);
		setActionType("challenge");

		writeContract(
			{
				address: config.contractAddress as Hash,
				abi: zkFairAbi,
				functionName: "requestAudit",
				args: [BigInt(batchId)],
				value: parseEther(AUDIT_STAKE),
			},
			{
				onError: (error) => {
					console.error("[useAuditActions] challenge error:", error);
					const shortMsg =
						(error as Error & { shortMessage?: string }).shortMessage ||
						error.message;
					toast.error("Challenge Failed", {
						description: shortMsg.slice(0, 100),
						duration: 5000,
					});
					setChallengingBatch(null);
					setActionType(null);
				},
			},
		);
	};

	const handleClaimExpiredAudit = (auditId: string) => {
		setClaimingAudit(auditId);
		setActionType("claim");

		writeContract(
			{
				address: config.contractAddress as Hash,
				abi: zkFairAbi,
				functionName: "slashExpiredAudit",
				args: [BigInt(auditId)],
			},
			{
				onError: (error) => {
					console.error("[useAuditActions] claim error:", error);
					const shortMsg =
						(error as Error & { shortMessage?: string }).shortMessage ||
						error.message;
					toast.error("Claim Failed", {
						description: shortMsg.slice(0, 100),
						duration: 5000,
					});
					setClaimingAudit(null);
					setActionType(null);
				},
			},
		);
	};

	return {
		handleChallenge,
		handleClaimExpiredAudit,
		challengingBatch,
		claimingAudit,
		isPending,
		isConfirming,
	};
}
