import { useCallback, useRef, useState } from "react";

export function useClipboard(resetDelay = 1500) {
	const [copiedField, setCopiedField] = useState<string | null>(null);
	const resetTimerRef = useRef<number | null>(null);

	const copy = useCallback(
		async (field: string, value: string) => {
			try {
				await navigator.clipboard.writeText(value);
				setCopiedField(field);

				if (resetTimerRef.current) {
					window.clearTimeout(resetTimerRef.current);
				}
				resetTimerRef.current = window.setTimeout(() => {
					setCopiedField(null);
				}, resetDelay);
			} catch (error) {
				console.error(`Failed to copy ${field}`, error);
			}
		},
		[resetDelay],
	);

	const cleanup = useCallback(() => {
		if (resetTimerRef.current) {
			window.clearTimeout(resetTimerRef.current);
		}
	}, []);

	return { copiedField, copy, cleanup };
}
