import { createFileRoute } from "@tanstack/react-router";
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { useState } from "react";
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
import { modelTableColumns } from "@/lib/model-table-columns";
import { useModels } from "@/lib/use-models";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const { models, isLoading } = useModels();
	const [globalFilter, setGlobalFilter] = useState("");

	const table = useReactTable({
		data: models ?? [],
		columns: modelTableColumns,
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

	if (!models) {
		return (
			<div className="min-h-screen w-full px-6 py-12">
				<div className="mx-auto max-w-[1600px]">
					<div className="flex flex-col items-center gap-4 py-16">
						<Loader2 className="h-12 w-12 animate-spin text-main" />
						<p className="text-foreground/70">Loading models...</p>
					</div>
				</div>
			</div>
		);
	}

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
											colSpan={modelTableColumns.length}
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
											colSpan={modelTableColumns.length}
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
