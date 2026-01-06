import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { DemoMode } from "@/lib/demo";

interface DemoHeaderProps {
	serverMode: DemoMode | null;
	isDemoActive: boolean;
	onToggleDemo: (enabled: boolean) => void;
}

export function DemoHeader({
	serverMode,
	isDemoActive,
	onToggleDemo,
}: DemoHeaderProps) {
	return (
		<div className="flex items-center justify-between">
			<div>
				<h1 className="font-bold text-2xl">Protocol Demo</h1>
				<p className="text-muted-foreground">
					Experience the zkfair protocol end-to-end. Toggle demo mode to enable
					instant fraud detection.
				</p>
			</div>
			<div className="flex items-center gap-4">
				{serverMode && (
					<Badge variant="outline" className="gap-1">
						Server Mode: <span className="font-mono">{serverMode}</span>
					</Badge>
				)}
				<Switch
					checked={isDemoActive}
					onCheckedChange={onToggleDemo}
					aria-label="Toggle demo mode"
				/>
			</div>
		</div>
	);
}
