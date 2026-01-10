export const DISPUTE_STAKE = "0.0001"; // ETH
export const AUDIT_STAKE = "0.00005"; // ETH

// Prediction scaling factor (contract expects int256 scaled by 1e6)
export const PREDICTION_SCALE_FACTOR = 1e6;

// Grace period before disputes can be filed
export const DISPUTE_GRACE_PERIOD_SECONDS = 10; // Contract value (demo: 10 seconds)
export const PRODUCTION_GRACE_PERIOD_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get grace period for fraud detection based on demo mode
 * - Production: 1 hour (wait for provider to batch)
 * - Demo: 0ms (instant fraud detection)
 */
export function getGracePeriodMs(): number {
	// Check localStorage for demo mode
	try {
		const isDemoMode = localStorage.getItem("zkfair_demo_mode") === "true";
		return isDemoMode ? 0 : PRODUCTION_GRACE_PERIOD_MS;
	} catch {
		return PRODUCTION_GRACE_PERIOD_MS;
	}
}
