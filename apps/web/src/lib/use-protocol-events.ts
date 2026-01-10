import { useEffect } from "react";
import { useEventStore } from "./event-store";
import {
	cleanupFraudDetector,
	initializeFraudDetector,
} from "./fraud-detector";

export function useProtocolEvents() {
	const initialize = useEventStore((state) => state.initialize);
	const isInitialized = useEventStore((state) => state.isInitialized);
	const events = useEventStore((state) => state.events);

	useEffect(() => {
		// init event store watchers
		const cleanup = initialize();

		initializeFraudDetector();

		return () => {
			cleanup();
			cleanupFraudDetector();
		};
	}, [initialize]);

	return { isInitialized, events };
}
