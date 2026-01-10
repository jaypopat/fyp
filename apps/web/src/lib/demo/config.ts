// localstorage persistence
const DEMO_MODE_KEY = "zkfair_demo_mode";
const DEMO_SELECTED_MODE_KEY = "zkfair_demo_selected_mode";

/**
 * Enable/disable demo mode
 * When enabled:
 * - Fraud detection skips 1-hour grace period (instant detection)
 * - UI shows demo-specific controls
 */
export function setDemoMode(enabled: boolean) {
	try {
		localStorage.setItem(DEMO_MODE_KEY, String(enabled));
	} catch {
		// localStorage may be unavailable
	}
	console.log(`[Demo] Mode: ${enabled ? "ON" : "OFF"}`);
}

/**
 * Check if demo mode is active
 */
export function isDemoMode(): boolean {
	try {
		return localStorage.getItem(DEMO_MODE_KEY) === "true";
	} catch {
		return false;
	}
}

/**
 * Get the persisted selected demo scenario
 */
export function getPersistedDemoMode(): DemoMode | null {
	try {
		const mode = localStorage.getItem(DEMO_SELECTED_MODE_KEY);
		if (
			mode === "honest" ||
			mode === "non-inclusion" ||
			mode === "fraudulent-inclusion"
		) {
			return mode;
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Persist the selected demo scenario
 */
export function setPersistedDemoMode(mode: DemoMode | null) {
	try {
		if (mode) {
			localStorage.setItem(DEMO_SELECTED_MODE_KEY, mode);
		} else {
			localStorage.removeItem(DEMO_SELECTED_MODE_KEY);
		}
	} catch {
		// localStorage may be unavailable
	}
}

/**
 * Clear all demo persistence
 */
export function clearDemoPersistence() {
	localStorage.removeItem(DEMO_MODE_KEY);
	localStorage.removeItem(DEMO_SELECTED_MODE_KEY);
}

/**
 * Get grace period for fraud detection based on demo mode
 * - Production: 1 hour (wait for provider to batch)
 * - Demo: 0ms (instant fraud detection)
 */
export function getGracePeriodMs(): number {
	return isDemoMode() ? 0 : 60 * 60 * 1000; // 0 in demo, 1 hour in production
}

/**
 * Demo configuration constants
 */
export const DEMO_CONFIG = {
	ENDPOINTS: {
		SET_MODE: "/demo/mode",
		COMMIT_BATCH: "/demo/commit-batch",
	},
} as const;

export type DemoMode = "honest" | "non-inclusion" | "fraudulent-inclusion";
