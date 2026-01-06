import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DemoMode } from "@/lib/demo";

interface DemoActionsProps {
	currentStep: number;
	selectedMode: DemoMode;
	loading: boolean;
	onCommitBatch: () => void;
}

export function DemoActions({
	currentStep,
	selectedMode,
	loading,
	onCommitBatch,
}: DemoActionsProps) {
	if (currentStep === 0) {
		return (
			<div className="flex h-full flex-col gap-4">
				<p className="text-muted-foreground text-sm">
					Make an inference query to a registered model. Your receipt will be
					stored locally. After making a query, come back here to continue the
					demo.
				</p>
				<Button asChild className="mt-auto w-full gap-2">
					<Link to="/">
						Go to Models → Try Inference
						<ArrowRight className="h-4 w-4" />
					</Link>
				</Button>
			</div>
		);
	}

	if (currentStep === 1) {
		return (
			<div className="flex h-full flex-col gap-4">
				<p className="text-muted-foreground text-sm">
					Receipt received! Waiting for the provider to commit a batch...
				</p>
				<div className="flex items-center gap-2 text-yellow-600">
					<div className="h-2 w-2 animate-pulse rounded-full bg-yellow-600" />
					Listening for BatchCommitted event
				</div>
				<div className="space-y-2">
					<Button
						onClick={onCommitBatch}
						disabled={loading}
						className="w-full gap-2"
					>
						Commit Batch Now
					</Button>
					<Button asChild variant="outline" className="w-full gap-2">
						<Link to="/receipts">
							View Receipts
							<ArrowRight className="h-4 w-4" />
						</Link>
					</Button>
				</div>
			</div>
		);
	}

	if (currentStep === 2) {
		return (
			<div className="space-y-4">
				<p className="text-muted-foreground text-sm">
					Batch committed! Verifying Merkle proof...
				</p>
				<div className="flex items-center gap-2 text-blue-600">
					<div className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
					Checking receipt against batch
				</div>
			</div>
		);
	}

	if (currentStep === 3) {
		if (selectedMode !== "honest") {
			return (
				<div className="flex h-full flex-col gap-4">
					<div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
						<p className="font-medium text-red-500">🚨 Fraud Detected!</p>
						<p className="mt-1 text-muted-foreground text-sm">
							{selectedMode === "non-inclusion"
								? "Your query was omitted from the batch."
								: "Your query data was tampered with."}
						</p>
					</div>
					<Button
						asChild
						variant="destructive"
						className="mt-auto w-full gap-2 text-black"
					>
						<Link to="/receipts">
							Go to Receipts to Dispute
							<ArrowRight className="h-4 w-4" />
						</Link>
					</Button>
				</div>
			);
		}
		return (
			<div className="space-y-4">
				<p className="text-muted-foreground text-sm">Verifying receipt...</p>
				<div className="flex items-center gap-2 text-blue-600">
					<div className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
					Processing verification
				</div>
			</div>
		);
	}

	if (currentStep === 4) {
		return (
			<div className="flex h-full flex-col gap-4">
				<div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4">
					<p className="font-medium text-green-500">✓ Receipt Verified!</p>
					<p className="mt-1 text-muted-foreground text-sm">
						Your query was correctly batched and verified on-chain.
					</p>
				</div>
				<p className="text-muted-foreground text-sm">
					Want to verify fairness? Go to the model page to request an audit via
					your wallet.
				</p>
				<Button asChild variant="outline" className="mt-auto w-full gap-2">
					<Link to="/receipts">
						View Verified Receipts
						<ArrowRight className="h-4 w-4" />
					</Link>
				</Button>
			</div>
		);
	}

	return null;
}
