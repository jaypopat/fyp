// enables the following:
// 1. Batch creation (honest vs fraudulent via server mode)
// 2. Grace period (instant fraud detection vs 1-hour wait)

export { commitBatch, getServerMode, setServerMode } from "./api";
export {
	clearDemoPersistence,
	DEMO_CONFIG,
	type DemoMode,
	getGracePeriodMs,
	getPersistedDemoMode,
	isDemoMode,
	setDemoMode,
	setPersistedDemoMode,
} from "./config";
