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
import { ArrowUpDown, ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";
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
import { createSDK } from "@/lib/sdk";
import {
	normalizeModels,
	type SDKModel,
	type SDKModelRaw,
} from "@/lib/sdk-types";

export const Route = createFileRoute("/")({
	loader: async () => {
		const sdk = createSDK();
		const rawModels = (await sdk.model.list()) as readonly SDKModelRaw[];
		const models = normalizeModels(rawModels);
		return { models };
	},
	component: HomeComponent,
});

function HomeComponent() {
	const { models } = Route.useLoaderData();
	const [globalFilter, setGlobalFilter] = useState("");

	const columns: ColumnDef<SDKModel>[] = useMemo(
		() => [
			{
				accessorKey: "name",
				header: ({ column }) => (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="h-auto p-0 hover:bg-transparent"
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
							className="font-semibold text-foreground transition-colors hover:text-primary"
						>
							{row.original.name}
						</Link>
						<p className="text-muted-foreground text-sm leading-relaxed">
							{row.original.description}
						</p>
						<div className="flex items-center gap-1.5 text-xs">
							<span className="text-muted-foreground">Author:</span>
							{config.explorerBase ? (
								<a
									href={`${config.explorerBase}/address/${row.original.author as string}`}
									target="_blank"
									rel="noreferrer"
									className="underline-offset-4 hover:underline"
									title="View author on explorer"
								>
									<code className="rounded bg-muted px-1.5 py-0.5 font-mono">
										{(row.original.author as string).slice(0, 6)}...
										{(row.original.author as string).slice(-4)}
									</code>
								</a>
							) : (
								<code className="rounded bg-muted px-1.5 py-0.5 font-mono">
									{(row.original.author as string).slice(0, 6)}...
									{(row.original.author as string).slice(-4)}
								</code>
							)}
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
						className="h-auto p-0 hover:bg-transparent"
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
						<code className="block rounded bg-muted px-2 py-1 font-mono text-xs">
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
						<code className="block rounded bg-muted px-2 py-1 font-mono text-xs">
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
						className="h-auto p-0 hover:bg-transparent"
					>
						Registered
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				),
				cell: ({ row }) => {
					const timestamp = row.getValue("registrationTimestamp") as number;
					const date = new Date(timestamp * 1000);
					return (
						<div className="font-medium text-foreground text-sm">
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
						className="inline-flex items-center gap-1.5 whitespace-nowrap text-primary text-sm transition-colors hover:text-primary/80"
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

	return (
		<div className="min-h-screen w-full px-6 py-12">
			<div className="mx-auto max-w-[1600px]">
				{/* Header */}
				<div className="mb-10">
					<h1 className="mb-3 font-bold text-4xl text-foreground tracking-tight">
						ZK AI Fairness Registry
					</h1>
					<p className="text-lg text-muted-foreground">
						Explore verified AI models and their fairness compliance status
					</p>
				</div>

				{/* Search Bar */}
				<Card className="mb-6 p-4 shadow-sm">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="relative max-w-md flex-1">
							<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search models by name or description..."
								value={globalFilter ?? ""}
								onChange={(event) => setGlobalFilter(event.target.value)}
								className="pl-10"
							/>
						</div>
						<div className="text-muted-foreground text-sm">
							<span className="font-medium text-foreground">
								{table.getFilteredRowModel().rows.length}
							</span>{" "}
							{table.getFilteredRowModel().rows.length === 1
								? "model"
								: "models"}
						</div>
					</div>
				</Card>

				{/* Table */}
				<Card className="overflow-hidden shadow-sm">
					<div className="w-full overflow-x-auto">
						<Table>
							<TableHeader>
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow
										key={headerGroup.id}
										className="border-b hover:bg-transparent"
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
								{table.getRowModel().rows?.length ? (
									table.getRowModel().rows.map((row) => (
										<TableRow
											key={row.id}
											className="transition-colors hover:bg-muted/50"
										>
											{row.getVisibleCells().map((cell) => (
												<TableCell key={cell.id} className="py-4">
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
												<Search className="h-8 w-8 text-muted-foreground" />
												<p className="text-muted-foreground text-sm">
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
					<p className="text-muted-foreground text-sm">
						Showing{" "}
						<span className="font-medium text-foreground">
							{table.getState().pagination.pageIndex *
								table.getState().pagination.pageSize +
								1}
						</span>{" "}
						to{" "}
						<span className="font-medium text-foreground">
							{Math.min(
								(table.getState().pagination.pageIndex + 1) *
									table.getState().pagination.pageSize,
								table.getFilteredRowModel().rows.length,
							)}
						</span>{" "}
						of{" "}
						<span className="font-medium text-foreground">
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
