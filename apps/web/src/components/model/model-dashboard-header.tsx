import { CheckCircle, Copy, ExternalLink, Shield, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { formatEther, type Hash } from "viem";
import { Button } from "@/components/ui/button";
import { config } from "@/config";
import { getModelStatusBadge } from "@/lib/model-status";
import { sdk } from "@/lib/sdk";

interface ModelDashboardHeaderProps {
	model: {
		name: string;
		description?: string;
		author: string;
		stake: bigint;
		status: number;
		weightsHash: string;
		inferenceUrl: string;
		registrationTimestamp: number;
		verificationTimestamp?: number | null;
	};
	batchCount: number;
	onCopy: (value: string) => void;
	copiedField: string | null;
}

interface ProviderMetrics {
	passedAudits: number;
	failedAudits: number;
	isLoading: boolean;
}

export function ModelDashboardHeader({
	model,
	batchCount,
	onCopy,
	copiedField,
}: ModelDashboardHeaderProps) {
	const [metrics, setMetrics] = useState<ProviderMetrics>({
		passedAudits: 0,
		failedAudits: 0,
		isLoading: true,
	});

	useEffect(() => {
		let mounted = true;

		const loadMetrics = async () => {
			try {
				const allModels = await sdk.model.list();
				const providerModels = allModels.filter(
					(m) => m.provider.toLowerCase() === model.author.toLowerCase(),
				);

				let passedAudits = 0;
				let failedAudits = 0;

				for (const m of providerModels) {
					const modelId = await sdk.model.getIdFromHash(m.weightsHash as Hash);
					const batches = await sdk.batch.getByModel(modelId);

					for (const batch of batches) {
						if (batch.audited) {
							if (batch.auditStatus === 1) passedAudits++;
							if (batch.auditStatus === 2) failedAudits++;
						}
					}
				}

				if (!mounted) return;
				setMetrics({ passedAudits, failedAudits, isLoading: false });
			} catch (error) {
				console.error("Failed to load metrics:", error);
				if (mounted) setMetrics((prev) => ({ ...prev, isLoading: false }));
			}
		};

		loadMetrics();
		return () => {
			mounted = false;
		};
	}, [model.author]);

	const stakeEth = Number(formatEther(model.stake));
	const totalAudits = metrics.passedAudits + metrics.failedAudits;
	const auditSuccessRate =
		totalAudits > 0
			? Math.round((metrics.passedAudits / totalAudits) * 100)
			: null;

	const truncateHash = (hash: string) =>
		`${hash.slice(0, 10)}...${hash.slice(-6)}`;

	return (
		<div className="flex flex-col gap-6 rounded-[var(--radius-base)] border-2 border-border bg-secondary-background py-6 text-foreground shadow-[var(--shadow)]">
			{/* Top Section: Name + Status + Key Stats */}
			<div className="flex flex-col gap-4 px-6 lg:flex-row lg:items-start lg:justify-between">
				{/* Left: Model Info */}
				<div className="min-w-0 flex-1 space-y-2">
					<div className="flex items-center gap-3">
						<h1 className="truncate font-semibold text-2xl">{model.name}</h1>
						{getModelStatusBadge(model.status)}
					</div>
					{model.description && (
						<p className="line-clamp-2 text-muted-foreground text-sm">
							{model.description}
						</p>
					)}
					{/* Hash + Provider Row */}
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs">
						<button
							type="button"
							onClick={() => onCopy(model.weightsHash)}
							className="group flex items-center gap-1.5 font-mono text-muted-foreground transition-colors hover:text-foreground"
						>
							{copiedField === model.weightsHash ? (
								<CheckCircle className="h-3 w-3 text-green-500" />
							) : (
								<Copy className="h-3 w-3" />
							)}
							{truncateHash(model.weightsHash)}
						</button>
						<span className="text-muted-foreground/50">·</span>
						<a
							href={`${config.explorerBase}/address/${model.author}`}
							target="_blank"
							rel="noreferrer"
							className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
						>
							Provider {model.author.slice(0, 6)}...{model.author.slice(-4)}
							<ExternalLink className="h-3 w-3" />
						</a>
					</div>
				</div>

				{/* Right: Key Metrics */}
				<div className="flex shrink-0 gap-6 lg:gap-8">
					{/* Stake */}
					<div className="text-center">
						<div className="flex items-center justify-center gap-1 text-muted-foreground text-xs">
							<Shield className="h-3 w-3" />
							Stake
						</div>
						<p className="font-semibold text-lg tabular-nums">
							{stakeEth.toFixed(2)}
							<span className="ml-0.5 font-normal text-muted-foreground text-xs">
								ETH
							</span>
						</p>
					</div>

					{/* Batches */}
					<div className="text-center">
						<div className="flex items-center justify-center gap-1 text-muted-foreground text-xs">
							<Zap className="h-3 w-3" />
							Batches
						</div>
						<p className="font-semibold text-lg tabular-nums">{batchCount}</p>
					</div>

					{/* Audit Score */}
					<div className="text-center">
						<div className="flex items-center justify-center gap-1 text-muted-foreground text-xs">
							<CheckCircle className="h-3 w-3" />
							Audits
						</div>
						{metrics.isLoading ? (
							<p className="font-semibold text-lg text-muted-foreground">—</p>
						) : totalAudits > 0 ? (
							<div className="flex items-baseline justify-center gap-1">
								<p className="font-semibold text-lg tabular-nums">
									{auditSuccessRate}%
								</p>
								<span className="text-muted-foreground text-xs">
									({metrics.passedAudits}/{totalAudits})
								</span>
							</div>
						) : (
							<p className="text-muted-foreground text-sm">None</p>
						)}
					</div>
				</div>
			</div>

			{/* Bottom Bar: Quick Links */}
			<div className="flex items-center justify-between border-border border-t-2 px-6 pt-4">
				<div className="flex items-center gap-4 text-muted-foreground text-xs">
					<span>
						Registered{" "}
						{new Date(model.registrationTimestamp * 1000).toLocaleDateString()}
					</span>
					{model.verificationTimestamp && (
						<>
							<span className="text-muted-foreground/50">·</span>
							<span>
								Certified{" "}
								{new Date(
									model.verificationTimestamp * 1000,
								).toLocaleDateString()}
							</span>
						</>
					)}
				</div>
				<Button
					variant="ghost"
					size="sm"
					className="h-7 gap-1.5 text-xs"
					asChild
				>
					<a href={model.inferenceUrl} target="_blank" rel="noreferrer">
						API Endpoint
						<ExternalLink className="h-3 w-3" />
					</a>
				</Button>
			</div>
		</div>
	);
}
