import { Copy, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const INSTALL_COMMAND = "bunx @zkfair/cli --help";

export function ProviderInfoBanner() {
	const [isDismissed, setIsDismissed] = useState(false);

	useEffect(() => {
		const dismissed = localStorage.getItem("provider-info-dismissed");
		if (dismissed) {
			setIsDismissed(true);
		}
	}, []);

	const handleDismiss = () => {
		setIsDismissed(true);
		localStorage.setItem("provider-info-dismissed", "true");
	};

	const handleCopyCommand = async () => {
		try {
			await navigator.clipboard.writeText(INSTALL_COMMAND);
			toast.success("Command copied to clipboard!");
		} catch {
			toast.error("Failed to copy command");
		}
	};

	if (isDismissed) {
		return null;
	}

	return (
		<Card className="mb-6 border-2 border-foreground/15 bg-white p-5 shadow-sm">
			<div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
				<div className="flex min-w-0 flex-1 items-start gap-3">
					<div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-main/10">
						<Zap className="h-4 w-4 text-main" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="font-semibold text-foreground">
							Want to register a model as a provider?
						</p>
						<div className="mt-2 flex flex-wrap items-center gap-2">
							<span className="text-foreground/70 text-sm">Run:</span>
							<div className="flex items-center gap-1.5">
								<code className="whitespace-nowrap rounded bg-foreground/5 px-2 py-1 font-mono text-foreground/80 text-xs">
									{INSTALL_COMMAND}
								</code>
								<Button
									size="sm"
									variant="ghost"
									onClick={handleCopyCommand}
									className="h-6 w-6 p-0 text-foreground/60 hover:text-foreground/80"
									title="Copy command"
								>
									<Copy className="h-3.5 w-3.5" />
								</Button>
							</div>
						</div>
					</div>
				</div>
				<Button
					variant="ghost"
					size="sm"
					onClick={handleDismiss}
					className="h-8 w-8 flex-shrink-0 cursor-pointer p-0 text-foreground/50 hover:text-foreground/70"
				>
					<X className="h-4 w-4" />
				</Button>
			</div>
		</Card>
	);
}
