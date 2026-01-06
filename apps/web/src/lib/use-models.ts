import type {
	ModelRegisteredEvent,
	ProviderSlashedEvent,
} from "@zkfair/sdk/browser";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { sdk } from "./sdk";
import { normalizeModels, type SDKModel, type SDKModelRaw } from "./sdk-types";

export function useModels() {
	const [models, setModels] = useState<SDKModel[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let mounted = true;

		const loadModels = async () => {
			try {
				const rawModels = (await sdk.model.list()) as readonly SDKModelRaw[];
				const normalized = normalizeModels(rawModels);

				if (!mounted) return;
				setModels(normalized);
			} catch (error) {
				console.error("Failed to load models:", error);
			} finally {
				if (mounted) setIsLoading(false);
			}
		};

		loadModels();

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		const unwatch = sdk.events.watchModelRegistered(
			async (event: ModelRegisteredEvent) => {
				try {
					const rawModel = (await sdk.model.get(
						event.weightsHash,
					)) as SDKModelRaw;
					const normalized = normalizeModels([rawModel])[0];

					if (!normalized) return;

					setModels((prev) => {
						if (prev.some((m) => m.weightsHash === normalized.weightsHash)) {
							return prev;
						}
						return [normalized, ...prev];
					});

					toast.success("New model registered", {
						description: `${normalized.name} by ${event.provider.slice(0, 6)}...${event.provider.slice(-4)}`,
					});
				} catch (error) {
					console.error("Failed to fetch new model data:", error);
				}
			},
		);

		return () => unwatch();
	}, []);

	useEffect(() => {
		const unwatch = sdk.events.watchModelCertified(() => {
			toast.success("Model certified!", {
				description: "Training verification completed ",
			});
		});

		return () => unwatch();
	}, []);

	useEffect(() => {
		const unwatch = sdk.events.watchProviderSlashed(
			async (event: ProviderSlashedEvent) => {
				try {
					const model = await sdk.model.getById(event.modelId);

					setModels((prev) =>
						prev.map((m) =>
							m.weightsHash === model.weightsHash
								? { ...m, stake: 0n, status: 2 }
								: m,
						),
					);

					toast.error("Provider slashed!", {
						description: `Provider ${event.provider.slice(0, 6)}...${event.provider.slice(-4)} has been slashed`,
					});
				} catch (error) {
					console.error("Failed to handle provider slashed event:", error);
				}
			},
		);

		return () => unwatch();
	}, []);

	return { models, isLoading };
}
