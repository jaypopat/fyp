import { useEffect, useState } from "react";
import type { Hash } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

type ActionType = "challenge" | "claim" | "dispute" | null;

interface TransactionState {
	actionType: ActionType;
	targetId: string | null;
}

export function useContractTransaction() {
	const [state, setState] = useState<TransactionState>({
		actionType: null,
		targetId: null,
	});

	const {
		writeContract,
		data: hash,
		isPending,
		error: writeError,
		reset,
	} = useWriteContract();

	const { isLoading: isConfirming, isSuccess: isConfirmed } =
		useWaitForTransactionReceipt({ hash });

	// Reset state when transaction completes
	useEffect(() => {
		if (isConfirmed) {
			setState({ actionType: null, targetId: null });
		}
	}, [isConfirmed]);

	const execute = (
		actionType: ActionType,
		targetId: string,
		config: Parameters<typeof writeContract>[0],
	) => {
		setState({ actionType, targetId });
		writeContract(config);
	};

	const resetTransaction = () => {
		setState({ actionType: null, targetId: null });
		reset();
	};

	return {
		execute,
		reset: resetTransaction,
		hash,
		isPending,
		isConfirming,
		isConfirmed,
		error: writeError,
		actionType: state.actionType,
		targetId: state.targetId,
		isLoading: isPending || isConfirming,
	};
}

// hook for batch challenges
export function useBatchChallenge() {
	const tx = useContractTransaction();

	const challenge = (
		batchId: string,
		contractAddress: Hash,
		abi: readonly unknown[],
	) => {
		tx.execute("challenge", batchId, {
			address: contractAddress,
			abi,
			functionName: "requestAudit",
			args: [BigInt(batchId)],
		});
	};

	const claimExpired = (
		auditId: string,
		contractAddress: Hash,
		abi: readonly unknown[],
	) => {
		tx.execute("claim", auditId, {
			address: contractAddress,
			abi,
			functionName: "slashExpiredAudit",
			args: [BigInt(auditId)],
		});
	};

	return {
		challenge,
		claimExpired,
		...tx,
		isChallengingBatch: (batchId: string) =>
			tx.actionType === "challenge" && tx.targetId === batchId && tx.isLoading,
		isClaimingAudit: (auditId: string) =>
			tx.actionType === "claim" && tx.targetId === auditId && tx.isLoading,
	};
}
