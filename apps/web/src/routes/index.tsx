import { createFileRoute, Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ProviderInfoBanner } from "@/components/provider-info-banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { config } from "@/config";
import { getModelStatusBadge } from "@/lib/model-status";
import type { SDKModel } from "@/lib/sdk-types";
import { useModels } from "@/lib/use-models";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const { models, isLoading } = useModels();
	const [globalFilter, setGlobalFilter] = useState("");

	const columns: ColumnDef<SDKModel>[] = useMemo(
		() => [
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
				accessorKey: "weightsHash",
				header: "Weights Hash",
				cell: ({ row }) => {
					const hash = row.getValue("weightsHash") as string;
					return (
						<code className="block rounded-[var(--radius-base)] border-2 border-border bg-secondary-background px-2 py-1 font-mono text-xs shadow-[var(--shadow)]">
							{hash.slice(0, 10)}...{hash.slice(-8)}
						</code>
					);
				},
			},
			{
				accessorKey: "datasetMerkleRoot",
				header: "Dataset Root",
				cell: ({ row }) => {
					const root = row.getValue("datasetMerkleRoot") as string;
					return (
						<code className="block rounded-[var(--radius-base)] border-2 border-border bg-secondary-background px-2 py-1 font-mono text-xs shadow-[var(--shadow)]">
							{root.slice(0, 10)}...{root.slice(-8)}
						</code>
					);
				},
			},
			{
				accessorKey: "registrationTimestamp",
				header: ({ column }) => (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="h-auto items-center p-0"
					>
						Registered
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				),
				cell: ({ row }) => {
					const timestamp = row.getValue("registrationTimestamp") as number;
					const date = new Date(timestamp * 1000);
					return (
						<div className={cn("text-sm", LABEL_EMPHASIS)}>
							{date.toLocaleDateString("en-US", {
								month: "short",
								day: "numeric",
								year: "numeric",
							})}
						</div>
					);
				},
			},
			{
				id: "actions",
				header: "",
				cell: ({ row }) => (
					<Link
						to="/model/$modelId"
						params={{ modelId: row.original.weightsHash }}
						className="inline-flex items-center gap-1.5 whitespace-nowrap text-main text-sm transition-colors hover:text-main/80"
					>
						View Details
						<ExternalLink className="h-3.5 w-3.5" />
					</Link>
				),
			},
		],
		[],
	);

	const table = useReactTable({
		data: models,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		globalFilterFn: "includesString",
		state: {
			globalFilter,
		},
		onGlobalFilterChange: setGlobalFilter,
		initialState: {
			pagination: {
				pageSize: 10,
			},
		},
	});

	const COUNT_TEXT = "text-sm text-foreground/70";
	const LABEL_EMPHASIS = "text-foreground font-medium";
	const HEADLINE = "mb-3 text-4xl font-bold tracking-tight text-foreground";
	const SUBHEAD = "text-lg text-foreground/70";
	const SEARCH_ICON =
		"absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60";

	return (
		<div className="min-h-screen w-full px-6 py-12">
			<div className="mx-auto max-w-[1600px]">
				{/* Header */}
				<div className="mb-10">
					<h1 className={HEADLINE}>ZK AI Fairness Registry</h1>
					<p className={SUBHEAD}>
						Explore verified AI models and their fairness compliance status
					</p>
				</div>

				{/* Provider Info Banner */}
				<ProviderInfoBanner />

				{/* Search Bar */}
				<Card className="mb-6 p-4">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="relative max-w-md flex-1">
							<Search className={SEARCH_ICON} />
							<Input
								placeholder="Search models by name or description..."
								value={globalFilter ?? ""}
								onChange={(event) => setGlobalFilter(event.target.value)}
								className="pl-10"
							/>
						</div>
						<div className={COUNT_TEXT}>
							<span className={LABEL_EMPHASIS}>
								{table.getFilteredRowModel().rows.length}
							</span>{" "}
							{table.getFilteredRowModel().rows.length === 1
								? "model"
								: "models"}
						</div>
					</div>
				</Card>

				{/* Table */}
				<Card className="overflow-hidden py-0">
					<div className="w-full overflow-x-auto">
						<Table>
							<TableHeader>
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow
										key={headerGroup.id}
										className="hover:bg-transparent"
									>
										{headerGroup.headers.map((header) => (
											<TableHead key={header.id} className="font-semibold">
												{header.isPlaceholder
													? null
													: flexRender(
															header.column.columnDef.header,
															header.getContext(),
														)}
											</TableHead>
										))}
									</TableRow>
								))}
							</TableHeader>
							<TableBody>
								{isLoading ? (
									<TableRow>
										<TableCell
											colSpan={columns.length}
											className="h-32 text-center"
										>
											<div className="flex flex-col items-center gap-2">
												<Loader2 className="h-8 w-8 animate-spin text-main" />
												<p className={COUNT_TEXT}>Loading models...</p>
											</div>
										</TableCell>
									</TableRow>
								) : table.getRowModel().rows?.length ? (
									table.getRowModel().rows.map((row) => (
										<TableRow
											key={row.id}
											className="transition-colors hover:bg-main/5"
										>
											{row.getVisibleCells().map((cell) => (
												<TableCell key={cell.id}>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext(),
													)}
												</TableCell>
											))}
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell
											colSpan={columns.length}
											className="h-32 text-center"
										>
											<div className="flex flex-col items-center gap-2">
												<Search className="h-8 w-8 text-foreground/60" />
												<p className={COUNT_TEXT}>
													No models found matching your search
												</p>
											</div>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				</Card>

				{/* Pagination */}
				<div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<p className={COUNT_TEXT}>
						Showing{" "}
						<span className={LABEL_EMPHASIS}>
							{table.getState().pagination.pageIndex *
								table.getState().pagination.pageSize +
								1}
						</span>{" "}
						to{" "}
						<span className={LABEL_EMPHASIS}>
							{Math.min(
								(table.getState().pagination.pageIndex + 1) *
									table.getState().pagination.pageSize,
								table.getFilteredRowModel().rows.length,
							)}
						</span>{" "}
						of{" "}
						<span className={LABEL_EMPHASIS}>
							{table.getFilteredRowModel().rows.length}
						</span>{" "}
						results
					</p>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							Next
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
