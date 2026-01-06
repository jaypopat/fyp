import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { formatEther } from "viem";
import { Button } from "@/components/ui/button";
import { config } from "@/config";
import { getModelStatusBadge } from "./model-status";
import type { SDKModel } from "./sdk-types";

export const modelTableColumns: ColumnDef<SDKModel>[] = [
	{
		accessorKey: "name",
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				className="h-auto items-center p-0"
			>
				Model Details
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		),
		cell: ({ row }) => (
			<div className="min-w-[280px] space-y-2">
				<Link
					to="/model/$modelId"
					params={{ modelId: row.original.weightsHash }}
					className="font-semibold text-foreground transition-colors hover:text-main"
				>
					{row.original.name}
				</Link>
				<p className="text-foreground/70 text-sm leading-relaxed">
					{row.original.description}
				</p>
				<div className="flex items-center gap-1.5 text-xs">
					<span className="text-foreground/70">Author:</span>
					<a
						href={`${config.explorerBase}/address/${row.original.author as string}`}
						target="_blank"
						rel="noreferrer"
						className="underline-offset-4 hover:underline"
						title="View author on explorer"
					>
						<code className="rounded-[var(--radius-base)] border-2 border-border bg-secondary-background px-1.5 py-0.5 font-mono shadow-[var(--shadow)]">
							{(row.original.author as string).slice(0, 6)}...
							{(row.original.author as string).slice(-4)}
						</code>
					</a>
				</div>
			</div>
		),
	},
	{
		accessorKey: "status",
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				className="h-auto items-center p-0"
			>
				Status
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		),
		cell: ({ row }) => (
			<div className="flex items-center">
				{getModelStatusBadge(row.original.status)}
			</div>
		),
	},
	{
		accessorKey: "stake",
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				className="h-auto items-center justify-center p-0"
			>
				Provider Staked
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		),
		cell: ({ row }) => {
			const stakeInEth = formatEther(row.original.stake);
			return (
				<div className="text-center font-mono text-sm">{stakeInEth} ETH</div>
			);
		},
	},
	{
		accessorKey: "inferenceUrl",
		header: "Inference",
		cell: ({ row }) => (
			<a
				href={row.original.inferenceUrl}
				target="_blank"
				rel="noreferrer"
				className="inline-flex items-center gap-1 text-blue-600 text-sm underline-offset-4 hover:underline"
				title="Open inference endpoint"
			>
				<ExternalLink className="h-3.5 w-3.5" />
				Endpoint
			</a>
		),
	},
	{
		id: "actions",
		header: () => <div className="text-right">Actions</div>,
		cell: ({ row }) => (
			<div className="flex justify-end">
				<Button variant="outline" size="sm" asChild>
					<Link
						to="/model/$modelId"
						params={{ modelId: row.original.weightsHash }}
					>
						View Details
					</Link>
				</Button>
			</div>
		),
	},
];
