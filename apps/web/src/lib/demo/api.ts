import { config } from "@/config";
import { DEMO_CONFIG, type DemoMode } from "./config";

const { ENDPOINTS } = DEMO_CONFIG;

/**
 * Get current server demo mode
 */
export async function getServerMode(): Promise<DemoMode | null> {
	try {
		const res = await fetch(`${config.serverUrl}${ENDPOINTS.SET_MODE}`);
		if (res.ok) {
			const data = await res.json();
			return data.mode;
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Set server demo mode (controls how batches are created)
 * - NORMAL: Honest batches with all queries included correctly
 * - NON_INCLUSION: Excludes queries from batch (detectable fraud)
 * - FRAUDULENT_INCLUSION: Tampers with Merkle tree data (detectable fraud)
 */
export async function setServerMode(mode: DemoMode): Promise<void> {
	const res = await fetch(`${config.serverUrl}${ENDPOINTS.SET_MODE}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ mode }),
	});

	if (!res.ok) {
		throw new Error("Failed to set server mode");
	}
}

/**
 * Trigger manual batch commitment (simulates provider batching)
 * The batch will be created according to the current demo mode.
 */
export async function commitBatch(): Promise<{
	batchId?: string;
	mode: DemoMode;
}> {
	const res = await fetch(`${config.serverUrl}${ENDPOINTS.COMMIT_BATCH}`, {
		method: "POST",
	});

	if (!res.ok) {
		throw new Error("Failed to commit batch");
	}

	return res.json();
}
