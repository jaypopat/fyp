import type {
	AuditProofSubmittedEvent,
	AuditRequestedEvent,
	BatchCommittedEvent,
	ModelCertifiedEvent,
} from "@zkfair/sdk";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Hash } from "viem";
import { sdk } from "./sdk";

export type BatchData = {
	batchId: string;
	modelId: string;
	merkleRoot: Hash;
	queryCount: string;
	seqNumStart: string;
	seqNumEnd: string;
	committedAt: string;
	audited: boolean;
	auditStatus: number;
	activeAuditId: string;
};

export function useModelBatches(weightsHash: Hash, initialModelId?: bigint) {
	const [batches, setBatches] = useState<BatchData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [modelIdBigInt, setModelIdBigInt] = useState<bigint | null>(
		initialModelId ?? null,
	);

	useEffect(() => {
		let mounted = true;

		const loadBatches = async () => {
			try {
				let modelId = modelIdBigInt;
				if (!modelId) {
					modelId = await sdk.model.getIdFromHash(weightsHash);
					if (!mounted) return;
					setModelIdBigInt(modelId);
				}

				const batchIds = await sdk.batch.getIdsByModel(modelId);
				const batchData = await sdk.batch.getByModel(modelId);

				if (!mounted) return;

				const processed = batchData.map((batch, index) => ({
					batchId: batchIds[index].toString(),
					modelId: batch.modelId.toString(),
					merkleRoot: batch.merkleRoot,
					queryCount: batch.queryCount.toString(),
					seqNumStart: batch.seqNumStart.toString(),
					seqNumEnd: batch.seqNumEnd.toString(),
					committedAt: batch.committedAt.toString(),
					audited: batch.audited,
					auditStatus: batch.auditStatus,
					activeAuditId: batch.activeAuditId.toString(),
				}));

				setBatches(processed);
			} catch (error) {
				console.error("Failed to load batches:", error);
			} finally {
				if (mounted) setIsLoading(false);
			}
		};

		loadBatches();

		return () => {
			mounted = false;
		};
	}, [weightsHash, modelIdBigInt]);
	useEffect(() => {
		if (!modelIdBigInt) return;

		const unwatch = sdk.events.watchBatchCommitted(
			async (event: BatchCommittedEvent) => {
				if (event.modelId !== modelIdBigInt) return;

				try {
					const batchData = await sdk.batch.get(event.batchId);

					const newBatch: BatchData = {
						batchId: event.batchId.toString(),
						modelId: event.modelId.toString(),
						merkleRoot: event.merkleRoot,
						queryCount: event.queryCount.toString(),
						seqNumStart: batchData.seqNumStart.toString(),
						seqNumEnd: batchData.seqNumEnd.toString(),
						committedAt: batchData.committedAt.toString(),
						audited: batchData.audited,
						auditStatus: batchData.auditStatus,
						activeAuditId: batchData.activeAuditId.toString(),
					};

					setBatches((prev) => {
						if (prev.some((b) => b.batchId === newBatch.batchId)) {
							return prev;
						}
						return [newBatch, ...prev];
					});

					toast.success(`New batch #${event.batchId} committed`, {
						description: `${event.queryCount} queries included`,
					});
				} catch (error) {
					console.error("Failed to fetch new batch data:", error);
				}
			},
		);

		return () => unwatch();
	}, [modelIdBigInt]);

	useEffect(() => {
		if (!modelIdBigInt) return;

		const unwatch = sdk.events.watchAuditRequested(
			async (event: AuditRequestedEvent) => {
				setBatches((prev) => {
					const batch = prev.find(
						(b) => b.batchId === event.batchId.toString(),
					);
					if (!batch) return prev;

					toast.info(`Audit requested for batch #${event.batchId}`, {
						description: "Fairness verification in progress",
					});

					return prev.map((b) =>
						b.batchId === event.batchId.toString()
							? { ...b, activeAuditId: event.auditId.toString() }
							: b,
					);
				});
			},
		);

		return () => unwatch();
	}, [modelIdBigInt]);

	useEffect(() => {
		if (!modelIdBigInt) return;

		const unwatch = sdk.events.watchAuditProofSubmitted(
			async (event: AuditProofSubmittedEvent) => {
				setBatches((prev) => {
					const batch = prev.find(
						(b) => b.activeAuditId === event.auditId.toString(),
					);
					if (!batch) return prev;

					const passed = event.passed;
					toast.success(
						`Audit ${passed ? "passed" : "failed"} for batch #${batch.batchId}`,
						{
							description: passed
								? "Fairness verified "
								: "Fairness violation detected",
						},
					);

					return prev.map((b) =>
						b.activeAuditId === event.auditId.toString()
							? {
									...b,
									audited: true,
									auditStatus: passed ? 1 : 2,
								}
							: b,
					);
				});
			},
		);

		return () => unwatch();
	}, [modelIdBigInt]);

	useEffect(() => {
		const unwatch = sdk.events.watchModelCertified(
			(_event: ModelCertifiedEvent) => {
				toast.success("Model certified!", {
					description: "Training verification completed",
				});
			},
		);

		return () => unwatch();
	}, []);

	return { batches, isLoading };
}
