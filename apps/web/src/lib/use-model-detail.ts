import type { ModelCertifiedEvent } from "@zkfair/sdk";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Hash } from "viem";
import { sdk } from "./sdk";
import { normalizeModel, type SDKModel, type SDKModelRaw } from "./sdk-types";

export function useModelDetail(weightsHash: Hash) {
	const [model, setModel] = useState<SDKModel | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let mounted = true;

		const loadModel = async () => {
			try {
				const rawModel = (await sdk.model.get(weightsHash)) as SDKModelRaw;
				const normalized = normalizeModel(rawModel);

				if (!mounted) return;
				setModel(normalized);
			} catch (error) {
				console.error("Failed to load model:", error);
			} finally {
				if (mounted) setIsLoading(false);
			}
		};

		loadModel();

		return () => {
			mounted = false;
		};
	}, [weightsHash]);

	useEffect(() => {
		if (!model) return;

		const unwatch = sdk.events.watchModelCertified(
			async (event: ModelCertifiedEvent) => {
				try {
					const modelId = await sdk.model.getIdFromHash(weightsHash);

					if (event.modelId === modelId) {
						setModel((prev) => {
							if (!prev) return prev;

							toast.success(`${prev.name} certified!`, {
								description: "Training verification completed ✓",
							});

							return { ...prev, status: 1 };
						});
					}
				} catch (error) {
					console.error("Failed to check model certification:", error);
				}
			},
		);

		return () => unwatch();
	}, [model, weightsHash]);

	return { model, isLoading };
}
