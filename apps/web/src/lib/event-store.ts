import type {
	AuditProofSubmittedEvent,
	AuditRequestedEvent,
	BatchCommittedEvent,
	DisputeRaisedEvent,
	ProviderSlashedEvent,
} from "@zkfair/sdk/browser";
import { create } from "zustand";
import { sdk } from "./sdk";

export type ProtocolEventType =
	| "BATCH_COMMITTED"
	| "AUDIT_REQUESTED"
	| "AUDIT_PROOF_SUBMITTED"
	| "DISPUTE_RAISED"
	| "PROVIDER_SLASHED";

export type ProtocolEvent =
	| {
			type: "BATCH_COMMITTED";
			timestamp: number;
			data: BatchCommittedEvent;
	  }
	| {
			type: "AUDIT_REQUESTED";
			timestamp: number;
			data: AuditRequestedEvent;
	  }
	| {
			type: "AUDIT_PROOF_SUBMITTED";
			timestamp: number;
			data: AuditProofSubmittedEvent;
	  }
	| {
			type: "DISPUTE_RAISED";
			timestamp: number;
			data: DisputeRaisedEvent;
	  }
	| {
			type: "PROVIDER_SLASHED";
			timestamp: number;
			data: ProviderSlashedEvent;
	  };

interface EventStoreState {
	events: ProtocolEvent[];
	isInitialized: boolean;

	// Actions
	addEvent: (event: ProtocolEvent) => void;
	clearEvents: () => void;
	initialize: () => () => void;

	// Computed
	getEventsByType: (type: ProtocolEventType) => ProtocolEvent[];
	getEventsByModel: (modelId: bigint) => ProtocolEvent[];
}

export const useEventStore = create<EventStoreState>((set, get) => ({
	events: [],
	isInitialized: false,

	addEvent: (event) => {
		set((state) => ({
			events: [...state.events, event].sort(
				(a, b) => b.timestamp - a.timestamp,
			),
		}));
	},

	clearEvents: () => {
		set({ events: [] });
	},

	initialize: () => {
		if (get().isInitialized) {
			return () => {};
		}

		const unwatchers: (() => void)[] = [];

		// Watch BatchCommitted events
		const unwatchBatch = sdk.events.watchBatchCommitted(
			(event: BatchCommittedEvent) => {
				console.log("[EventStore] BatchCommitted:", event);
				get().addEvent({
					type: "BATCH_COMMITTED",
					timestamp: Date.now(),
					data: event,
				});
			},
		);
		unwatchers.push(unwatchBatch);

		// Watch AuditRequested events
		const unwatchAuditReq = sdk.events.watchAuditRequested(
			(event: AuditRequestedEvent) => {
				console.log("[EventStore] AuditRequested:", event);
				get().addEvent({
					type: "AUDIT_REQUESTED",
					timestamp: Date.now(),
					data: event,
				});
			},
		);
		unwatchers.push(unwatchAuditReq);

		// Watch AuditProofSubmitted events
		const unwatchAuditProof = sdk.events.watchAuditProofSubmitted(
			(event: AuditProofSubmittedEvent) => {
				console.log("[EventStore] AuditProofSubmitted:", event);
				get().addEvent({
					type: "AUDIT_PROOF_SUBMITTED",
					timestamp: Date.now(),
					data: event,
				});
			},
		);
		unwatchers.push(unwatchAuditProof);

		// Watch ProviderSlashed events
		const unwatchSlashed = sdk.events.watchProviderSlashed(
			(event: ProviderSlashedEvent) => {
				console.log("[EventStore] ProviderSlashed:", event);
				get().addEvent({
					type: "PROVIDER_SLASHED",
					timestamp: Date.now(),
					data: event,
				});
			},
		);
		unwatchers.push(unwatchSlashed);

		set({ isInitialized: true });

		return () => {
			for (const unwatch of unwatchers) {
				unwatch();
			}
			set({ isInitialized: false });
		};
	},

	getEventsByType: (type) => {
		return get().events.filter((e) => e.type === type);
	},

	getEventsByModel: (modelId) => {
		return get().events.filter((e) => {
			if (e.type === "BATCH_COMMITTED") {
				return e.data.modelId === modelId;
			}
			if (e.type === "AUDIT_REQUESTED") {
				// AuditRequested has batchId, need to look up modelId
				return false; // For now, can enhance later
			}
			return false;
		});
	},
}));

type BatchCommittedCallback = (event: BatchCommittedEvent) => void;

const batchCommittedCallbacks: Set<BatchCommittedCallback> = new Set();

/**
 * Subscribe to BatchCommitted events
 * Returns unsubscribe function
 */
export function onBatchCommitted(callback: BatchCommittedCallback): () => void {
	batchCommittedCallbacks.add(callback);
	return () => batchCommittedCallbacks.delete(callback);
}

// Internal: notify subscribers when batch committed
useEventStore.subscribe((state, prevState) => {
	const newEvents = state.events.filter(
		(e) => !prevState.events.includes(e) && e.type === "BATCH_COMMITTED",
	);
	for (const event of newEvents) {
		if (event.type === "BATCH_COMMITTED") {
			for (const callback of batchCommittedCallbacks) {
				callback(event.data);
			}
		}
	}
});
