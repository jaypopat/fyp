import { createFileRoute } from "@tanstack/react-router";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ExternalLink, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

// Mock data - replace with your SDK calls
const mockModels = [
  {
    id: "0x1234567890abcdef",
    name: "Credit Risk Model v2.1",
    description: "Loan approval prediction model",
    owner: "0xABC...DEF",
    registeredAt: new Date("2024-01-15"),
    lastAudit: new Date("2024-03-01"),
    status: "verified" as const,
    riskLevel: "high" as const,
    demographicParityGap: 0.03,
    equalityOpportunityGap: 0.04,
    auditCount: 12,
  },
  {
    id: "0xfedcba0987654321",
    name: "Hiring Screening AI",
    description: "Resume screening and candidate evaluation",
    owner: "0x123...456",
    registeredAt: new Date("2024-02-20"),
    lastAudit: new Date("2024-03-15"),
    status: "pending_audit" as const,
    riskLevel: "medium" as const,
    demographicParityGap: 0.02,
    equalityOpportunityGap: 0.05,
    auditCount: 8,
  },
  {
    id: "0xabcdef1234567890",
    name: "Insurance Premium Calculator",
    description: "Auto insurance risk assessment model",
    owner: "0x789...ABC",
    registeredAt: new Date("2024-03-10"),
    lastAudit: new Date("2024-03-20"),
    status: "non_compliant" as const,
    riskLevel: "low" as const,
    demographicParityGap: 0.08,
    equalityOpportunityGap: 0.07,
    auditCount: 3,
  },
];

type ModelData = (typeof mockModels)[0];

function getStatusBadge(status: ModelData["status"]) {
  switch (status) {
    case "verified":
      return <Badge variant="default" className="bg-green-500">Verified</Badge>;
    case "pending_audit":
      return <Badge variant="secondary">Pending Audit</Badge>;
    case "non_compliant":
      return <Badge variant="destructive">Non-Compliant</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

function getRiskLevelBadge(riskLevel: ModelData["riskLevel"]) {
  switch (riskLevel) {
    case "high":
      return <Badge variant="destructive" className="bg-red-500">High Risk</Badge>;
    case "medium":
      return <Badge variant="secondary" className="bg-yellow-500">Medium Risk</Badge>;
    case "low":
      return <Badge variant="outline">Low Risk</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

function HomeComponent() {
  const [globalFilter, setGlobalFilter] = useState("");

  const columns: ColumnDef<ModelData>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Model Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.getValue("name")}</div>
            <div className="text-muted-foreground text-sm">
              {row.original.description}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "owner",
        header: "Owner",
        cell: ({ row }) => (
          <code className="rounded bg-muted px-2 py-1 text-sm">
            {row.getValue("owner")}
          </code>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => getStatusBadge(row.getValue("status")),
      },
      {
        accessorKey: "riskLevel",
        header: "Risk Level",
        cell: ({ row }) => getRiskLevelBadge(row.getValue("riskLevel")),
      },
      {
        accessorKey: "demographicParityGap",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            DP Gap
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const gap = row.getValue("demographicParityGap") as number;
          const percentage = (gap * 100).toFixed(1);
          return (
            <span className={gap > 0.05 ? "text-red-600" : "text-green-600"}>
              {percentage}%
            </span>
          );
        },
      },
      {
        accessorKey: "lastAudit",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Last Audit
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const date = row.getValue("lastAudit") as Date;
          return date.toLocaleDateString();
        },
      },
      {
        accessorKey: "auditCount",
        header: "Total Audits",
        cell: ({ row }) => (
          <span className="font-mono">{row.getValue("auditCount")}</span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Link
            to="/model/$modelId"
            params={{ modelId: row.original.id }}
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View Details
            <ExternalLink className="h-3 w-3" />
          </Link>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: mockModels,
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
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 font-bold text-3xl text-foreground">
          ZK AI Fairness Registry
        </h1>
        <p className="text-muted-foreground">
          Explore registered AI models and their fairness verification status
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-muted-foreground text-sm">
          {table.getFilteredRowModel().rows.length} of {mockModels.length} models
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="font-semibold">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No models found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-muted-foreground text-sm">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{" "}
          of {table.getFilteredRowModel().rows.length} results
        </div>
        <div className="space-x-2">
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
  );
}
