import {
	AlertCircle,
	CheckCircle2,
	Package,
	Shield,
	TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Hash } from "viem";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { config } from "@/config";
import { sdk } from "@/lib/sdk";

interface ProviderStatsCardProps {
	provider: Hash;
	currentModelId: bigint;
}

interface ProviderStats {
	totalModels: number;
	totalBatches: number;
	totalAudits: number;
	passedAudits: number;
	failedAudits: number;
	slashCount: number;
	totalStake: bigint;
}

export function ProviderStatsCard({
	provider,
	currentModelId,
}: ProviderStatsCardProps) {
	const [stats, setStats] = useState<ProviderStats | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let mounted = true;

		const loadStats = async () => {
			try {
				// Get all models by this provider
				const allModels = await sdk.model.list();
				const providerModels = allModels.filter(
					(m) => m.provider.toLowerCase() === provider.toLowerCase(),
				);

				let totalBatches = 0;
				let totalAudits = 0;
				let passedAudits = 0;
				let failedAudits = 0;
				let totalStake = 0n;

				for (const model of providerModels) {
					const modelId = await sdk.model.getIdFromHash(
						model.weightsHash as Hash,
					);
					const batches = await sdk.batch.getByModel(modelId);
					totalBatches += batches.length;
					totalStake += model.stake;

					// Count audits per batch
					for (const batch of batches) {
						if (batch.audited) {
							totalAudits++;
							if (batch.auditStatus === 1) passedAudits++; // AuditStatus.PASSED
							if (batch.auditStatus === 2) failedAudits++; // AuditStatus.FAILED
						}
					}
				}

				// Count slashes from events (simplified - in production would query events)
				const slashCount = providerModels.filter((m) => m.status === 2).length; // ModelStatus.SLASHED

				if (!mounted) return;

				setStats({
					totalModels: providerModels.length,
					totalBatches,
					totalAudits,
					passedAudits,
					failedAudits,
					slashCount,
					totalStake,
				});
			} catch (error) {
				console.error("Failed to load provider stats:", error);
			} finally {
				if (mounted) setLoading(false);
			}
		};

		loadStats();

		return () => {
			mounted = false;
		};
	}, [provider]);

	if (loading) {
		return (
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="flex items-center gap-2 font-semibold text-base">
						<TrendingUp className="h-4 w-4" />
						Provider Analytics
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">Loading...</p>
				</CardContent>
			</Card>
		);
	}

	if (!stats) return null;

	const auditSuccessRate =
		stats.totalAudits > 0
			? ((stats.passedAudits / stats.totalAudits) * 100).toFixed(0)
			: "N/A";

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 font-semibold text-base">
						<TrendingUp className="h-4 w-4" />
						Provider Analytics
					</CardTitle>
					{stats.slashCount > 0 && (
						<Badge variant="destructive" className="gap-1">
							<AlertCircle className="h-3 w-3" />
							{stats.slashCount} slashed
						</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Model Stats */}
				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-1">
						<p className="flex items-center gap-1 text-muted-foreground text-xs">
							<Package className="h-3 w-3" />
							Total Models
						</p>
						<p className="font-semibold text-2xl">{stats.totalModels}</p>
					</div>
					<div className="space-y-1">
						<p className="flex items-center gap-1 text-muted-foreground text-xs">
							<Shield className="h-3 w-3" />
							Total Batches
						</p>
						<p className="font-semibold text-2xl">{stats.totalBatches}</p>
					</div>
				</div>

				{/* Audit Performance */}
				{stats.totalAudits > 0 && (
					<div className="space-y-2">
						<p className="text-muted-foreground text-xs">Audit Performance</p>
						<div className="flex items-center gap-2">
							<div className="flex-1">
								<div className="flex items-center justify-between text-xs">
									<span className="flex items-center gap-1">
										<CheckCircle2 className="h-3 w-3 text-green-500" />
										Passed: {stats.passedAudits}
									</span>
									<span className="flex items-center gap-1">
										<AlertCircle className="h-3 w-3 text-red-500" />
										Failed: {stats.failedAudits}
									</span>
								</div>
								<div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
									<div
										className="h-full bg-green-500"
										style={{
											width: `${stats.totalAudits > 0 ? (stats.passedAudits / stats.totalAudits) * 100 : 0}%`,
										}}
									/>
								</div>
							</div>
							<div className="font-mono font-semibold text-lg">
								{auditSuccessRate}%
							</div>
						</div>
					</div>
				)}

				{/* Provider Link */}
				<div className="border-t pt-3">
					<p className="text-muted-foreground text-xs">Provider Address</p>
					<a
						href={`${config.explorerBase}/address/${provider}`}
						target="_blank"
						rel="noreferrer"
						className="block break-all font-mono text-sm underline-offset-4 hover:underline"
					>
						{provider}
					</a>
				</div>
			</CardContent>
		</Card>
	);
}
