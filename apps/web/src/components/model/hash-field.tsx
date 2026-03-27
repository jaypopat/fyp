export function formatHash(value?: string, fallback = "—") {
	if (!value) return fallback;
	return value.length > 20 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
}
