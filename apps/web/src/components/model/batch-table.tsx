import { AlertCircle, Clock, Radio, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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

export interface BatchData {
	batchId: string;
	queryCount: number;
	merkleRoot: string;
	committedAt: string;
	audited: boolean;
	auditStatus: number;
	activeAuditId: string;
	auditDeadline?: string;
	seqNumStart: string;
	seqNumEnd: string;
}

interface BatchTableProps {
	batches: BatchData[];
	isLoading: boolean;
	userSeqNums: Set<number>;
	auditEventsCount: number;
	challengingBatch: string | null;
	claimingAudit: string | null;
	isPending: boolean;
	isConfirming: boolean;
	onChallenge: (batchId: string) => void;
	onClaimExpired: (auditId: string) => void;
}

export function BatchTable({
	batches,
	isLoading,
	userSeqNums,
	auditEventsCount,
	challengingBatch,
	claimingAudit,
	isPending,
	isConfirming,
	onChallenge,
	onClaimExpired,
}: BatchTableProps) {
	const batchContainsUserQuery = (batch: BatchData) => {
		const start = Number(batch.seqNumStart);
		const end = Number(batch.seqNumEnd);
		for (const seqNum of userSeqNums) {
			if (seqNum >= start && seqNum <= end) return true;
		}
		return false;
	};

	const isAuditExpired = (batch: BatchData) => {
		if (batch.activeAuditId === "0") return false;
		if (!batch.auditDeadline) return false;
		const deadline = Number(batch.auditDeadline);
		const now = Math.floor(Date.now() / 1000);
		return now > deadline;
	};

	if (batches.length === 0) {
		return null;
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 font-semibold text-base">
						<Shield className="h-4 w-4" />
						Batch Commitments ({batches.length})
						{auditEventsCount > 0 && (
							<Badge variant="secondary" className="ml-2 gap-1 text-xs">
								<Radio className="h-3 w-3 animate-pulse text-blue-500" />
								{auditEventsCount} audit event
								{auditEventsCount !== 1 ? "s" : ""}
							</Badge>
						)}
					</CardTitle>
					{userSeqNums.size > 0 && (
						<Badge variant="outline" className="text-xs">
							{userSeqNums.size} of your queries
						</Badge>
					)}
				</div>
				<CardDescription className="text-xs">
					Provider-committed query batches. Challenge any batch to verify
					fairness.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
						Loading batches...
					</div>
				) : (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow className="text-xs">
									<TableHead className="w-20">Batch</TableHead>
									<TableHead className="w-24">Queries</TableHead>
									<TableHead>Merkle Root</TableHead>
									<TableHead className="w-40">Committed</TableHead>
									<TableHead className="w-20 text-center">Status</TableHead>
									<TableHead className="w-32">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{batches.map((batch) => (
									<BatchRow
										key={batch.batchId}
										batch={batch}
										hasUserQuery={batchContainsUserQuery(batch)}
										isExpired={isAuditExpired(batch)}
										challengingBatch={challengingBatch}
										claimingAudit={claimingAudit}
										isPending={isPending}
										isConfirming={isConfirming}
										onChallenge={onChallenge}
										onClaimExpired={onClaimExpired}
									/>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

interface BatchRowProps {
	batch: BatchData;
	hasUserQuery: boolean;
	isExpired: boolean;
	challengingBatch: string | null;
	claimingAudit: string | null;
	isPending: boolean;
	isConfirming: boolean;
	onChallenge: (batchId: string) => void;
	onClaimExpired: (auditId: string) => void;
}

function BatchRow({
	batch,
	hasUserQuery,
	isExpired,
	challengingBatch,
	claimingAudit,
	isPending,
	isConfirming,
	onChallenge,
	onClaimExpired,
}: BatchRowProps) {
	const hasActiveAudit = batch.activeAuditId !== "0" && !batch.audited;
	const hasCompletedAudit = batch.activeAuditId !== "0" && batch.audited;
	const isChallengePending =
		(isPending || isConfirming) && challengingBatch === batch.batchId;
	const isClaimPending =
		(isPending || isConfirming) && claimingAudit === batch.activeAuditId;

	return (
		<TableRow
			className={`text-xs ${hasUserQuery ? "bg-primary/5 hover:bg-primary/10" : ""}`}
		>
			<TableCell className="font-medium">
				#{batch.batchId}
				{hasUserQuery && (
					<Badge variant="outline" className="ml-2 px-1 py-0 text-[10px]">
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
				{new Date(Number(batch.committedAt) * 1000).toLocaleString(undefined, {
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				})}
			</TableCell>
			<TableCell className="text-center">
				<BatchStatus
					batch={batch}
					hasActiveAudit={hasActiveAudit}
					isExpired={isExpired}
				/>
			</TableCell>
			<TableCell>
				<BatchActions
					batch={batch}
					hasActiveAudit={hasActiveAudit}
					hasCompletedAudit={hasCompletedAudit}
					isExpired={isExpired}
					isChallengePending={isChallengePending}
					isClaimPending={isClaimPending}
					onChallenge={onChallenge}
					onClaimExpired={onClaimExpired}
				/>
			</TableCell>
		</TableRow>
	);
}

function BatchStatus({
	batch,
	hasActiveAudit,
	isExpired,
}: {
	batch: BatchData;
	hasActiveAudit: boolean;
	isExpired: boolean;
}) {
	if (batch.audited) {
		return getAuditStatusBadge(batch.auditStatus);
	}

	if (hasActiveAudit) {
		if (isExpired) {
			return (
				<Badge variant="destructive" className="gap-1 text-xs">
					<Clock className="h-3 w-3" />
					Expired
				</Badge>
			);
		}
		return (
			<Badge variant="secondary" className="animate-pulse gap-1 text-xs">
				<Clock className="h-3 w-3" />
				Auditing
			</Badge>
		);
	}

	return (
		<Badge variant="outline" className="text-xs">
			Pending
		</Badge>
	);
}

function BatchActions({
	batch,
	hasActiveAudit,
	hasCompletedAudit,
	isExpired,
	isChallengePending,
	isClaimPending,
	onChallenge,
	onClaimExpired,
}: {
	batch: BatchData;
	hasActiveAudit: boolean;
	hasCompletedAudit: boolean;
	isExpired: boolean;
	isChallengePending: boolean;
	isClaimPending: boolean;
	onChallenge: (batchId: string) => void;
	onClaimExpired: (auditId: string) => void;
}) {
	// If batch has a completed audit (regardless of pass/fail)
	if (hasCompletedAudit) {
		if (batch.auditStatus === 1) {
			return <span className="text-green-600 text-xs">✓ Verified</span>;
		}
		return (
			<a
				href={`${config.explorerBase}/tx/${batch.activeAuditId}`}
				target="_blank"
				rel="noreferrer"
				className="text-blue-600 text-xs underline-offset-4 hover:underline"
			>
				View Audit
			</a>
		);
	}

	// If batch has an active audit in progress
	if (hasActiveAudit) {
		if (isExpired) {
			return (
				<Button
					size="sm"
					variant="destructive"
					onClick={() => onClaimExpired(batch.activeAuditId)}
					disabled={isClaimPending}
					className="h-7 gap-1 text-xs"
				>
					{isClaimPending ? "Claiming..." : "Claim Reward"}
				</Button>
			);
		}
		return (
			<Button
				size="sm"
				variant="secondary"
				disabled
				className="h-7 gap-1 text-xs"
			>
				<AlertCircle className="h-3 w-3" />
				Audit Pending
			</Button>
		);
	}

	// No audit - allow challenge
	return (
		<Button
			size="sm"
			variant="outline"
			onClick={() => onChallenge(batch.batchId)}
			disabled={isChallengePending}
			className="h-7 gap-1 text-xs"
		>
			<AlertCircle className="h-3 w-3" />
			{isChallengePending ? "..." : "Challenge"}
		</Button>
	);
}
