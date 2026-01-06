import { AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { config } from "@/config";
import { getAuditStatusBadge } from "@/lib/model-status";
import { formatHash } from "./hash-field";

interface Batch {
	batchId: string;
	queryCount: string;
	merkleRoot: string;
	committedAt: string;
	audited: boolean;
	auditStatus: number;
	activeAuditId: string;
	auditDeadline?: string;
	seqNumStart: string;
	seqNumEnd: string;
}

interface ModelBatchesCardProps {
	batches: Batch[] | undefined;
	isLoading: boolean;
	userSeqNums: Set<number>;
	onChallenge: (batchId: string) => void;
	onClaimExpiredAudit: (auditId: string) => void;
	challengingBatch: string | null;
	claimingAudit: string | null;
	isPending: boolean;
	isConfirming: boolean;
}

export function ModelBatchesCard({
	batches,
	isLoading,
	userSeqNums,
	onChallenge,
	onClaimExpiredAudit,
	challengingBatch,
	claimingAudit,
	isPending,
	isConfirming,
}: ModelBatchesCardProps) {
	// Check if a batch contains any of the user's queries
	const batchContainsUserQuery = (batch: Batch) => {
		const start = Number(batch.seqNumStart);
		const end = Number(batch.seqNumEnd);
		for (const seqNum of userSeqNums) {
			if (seqNum >= start && seqNum <= end) return true;
		}
		return false;
	};

	// Helper to check if an audit has expired
	const isAuditExpired = (batch: Batch) => {
		if (batch.activeAuditId === "0") return false;
		if (!batch.auditDeadline) return false;
		const deadline = Number(batch.auditDeadline);
		const now = Math.floor(Date.now() / 1000);
		return now > deadline;
	};

	if (isLoading) {
		return (
			<p className="py-8 text-center text-muted-foreground text-sm">
				Loading batch history...
			</p>
		);
	}

	if (!batches || batches.length === 0) {
		return (
			<p className="py-8 text-center text-muted-foreground text-sm">
				No batches found for this model.
			</p>
		);
	}

	return (
		<div className="w-full overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="text-xs">Batch ID</TableHead>
						<TableHead className="text-xs">Queries</TableHead>
						<TableHead className="text-xs">Merkle Root</TableHead>
						<TableHead className="text-xs">Committed</TableHead>
						<TableHead className="text-center text-xs">Audit Status</TableHead>
						<TableHead className="text-xs">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{batches.map((batch) => {
						const hasUserQuery = batchContainsUserQuery(batch);
						const hasActiveAudit =
							batch.activeAuditId !== "0" && !batch.audited;

						return (
							<TableRow
								key={batch.batchId}
								className={`text-xs ${hasUserQuery ? "bg-primary/5 hover:bg-primary/10" : ""}`}
							>
								<TableCell className="font-medium">
									#{batch.batchId}
									{hasUserQuery && (
										<Badge
											variant="outline"
											className="ml-2 px-1 py-0 text-[10px]"
										>
											You
										</Badge>
									)}
								</TableCell>
								<TableCell>{batch.queryCount}</TableCell>
								<TableCell>
									<code className="rounded bg-muted px-1.5 py-0.5 text-xs">
										{formatHash(batch.merkleRoot, "—")}
									</code>
								</TableCell>
								<TableCell className="text-xs">
									{new Date(Number(batch.committedAt) * 1000).toLocaleString(
										undefined,
										{
											month: "short",
											day: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										},
									)}
								</TableCell>
								<TableCell className="text-center">
									{batch.audited ? (
										getAuditStatusBadge(batch.auditStatus)
									) : hasActiveAudit ? (
										isAuditExpired(batch) ? (
											<Badge variant="destructive" className="gap-1 text-xs">
												<Clock className="h-3 w-3" />
												Expired
											</Badge>
										) : (
											<Badge
												variant="secondary"
												className="animate-pulse gap-1 text-xs"
											>
												<Clock className="h-3 w-3" />
												Auditing
											</Badge>
										)
									) : (
										<Badge variant="outline" className="text-xs">
											Pending
										</Badge>
									)}
								</TableCell>
								<TableCell>
									{!batch.audited ? (
										batch.activeAuditId !== "0" ? (
											isAuditExpired(batch) ? (
												<Button
													size="sm"
													variant="destructive"
													onClick={() =>
														onClaimExpiredAudit(batch.activeAuditId)
													}
													disabled={
														(isPending &&
															claimingAudit === batch.activeAuditId) ||
														(isConfirming &&
															claimingAudit === batch.activeAuditId)
													}
													className="h-7 gap-1 text-xs"
												>
													{(isPending || isConfirming) &&
													claimingAudit === batch.activeAuditId
														? "Claiming..."
														: "Claim Reward"}
												</Button>
											) : (
												<Button
													size="sm"
													variant="secondary"
													disabled
													className="h-7 gap-1 text-xs"
												>
													<AlertCircle className="h-3 w-3" />
													Audit Pending
												</Button>
											)
										) : (
											<Button
												size="sm"
												variant="outline"
												onClick={() => onChallenge(batch.batchId)}
												disabled={
													(isPending && challengingBatch === batch.batchId) ||
													(isConfirming && challengingBatch === batch.batchId)
												}
												className="h-7 gap-1 text-xs"
											>
												<AlertCircle className="h-3 w-3" />
												{(isPending || isConfirming) &&
												challengingBatch === batch.batchId
													? "..."
													: "Challenge"}
											</Button>
										)
									) : batch.auditStatus === 1 ? (
										<span className="text-green-600 text-xs">✓ Verified</span>
									) : (
										<a
											href={`${config.explorerBase}/tx/${batch.activeAuditId}`}
											target="_blank"
											rel="noreferrer"
											className="text-blue-600 text-xs underline-offset-4 hover:underline"
										>
											View Audit
										</a>
									)}
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
