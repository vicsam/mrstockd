"use client";

import type { ListingStatus } from "@mrstockd/catalog";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useMemo } from "react";
import { StatusBadge } from "@/components/status-badge";
import { formatAgo, formatPercent, formatPrice } from "@/lib/format";
import { DataGrid } from "./data-grid";

/** One tool's row, as sent from the server (dates as ISO strings). */
export interface ToolRow {
  id: string;
  slug: string;
  name: string;
  sellerName: string;
  status: ListingStatus;
  pricingModel: "credits" | "subscription";
  unitPriceCents: number;
  calls24h: number;
  calls7d: number;
  testCalls7d: number;
  failures7d: number;
  failureRate7d: number | null;
  avgLatencyMs7d: number | null;
  p95LatencyMs7d: number | null;
  callsAllTime: number;
  lastCallAt: string | null;
  activeKeys: number;
  buyers: number;
  sellerRevenueCents: number;
  grossSalesCents: number;
}

export interface CallRowData {
  at: string;
  toolName: string;
  toolSlug: string;
  statusCode: number;
  latencyMs: number;
  creditsUsed: number;
  environment: "live" | "test";
}

const STATUS_ORDER: ListingStatus[] = ["in_review", "live", "paused", "rejected", "draft"];
type Cell<V> = { value: V | null | undefined };
const num = (p: Cell<number>) => (p.value === null || p.value === undefined ? "–" : p.value.toLocaleString("en-US"));
const ms = (p: Cell<number>) => (p.value === null || p.value === undefined ? "–" : `${p.value.toLocaleString("en-US")} ms`);
const money = (p: Cell<number>) => formatPrice(p.value ?? 0);

/** Failure rate with a word, not just a color: Healthy, Watch, Failing. */
function FailureRate({ value }: ICellRendererParams<ToolRow, number | null>) {
  if (value === null || value === undefined) return <span className="text-muted">No calls</span>;
  const level = value >= 0.1 ? "Failing" : value >= 0.02 ? "Watch" : "Healthy";
  const tone = level === "Failing" ? "text-red-700 dark:text-red-300" : level === "Watch" ? "text-amber-700 dark:text-amber-300" : "";
  return (
    <span className={tone}>
      {formatPercent(value)} <span className="text-xs">· {level}</span>
    </span>
  );
}

export function ToolsGrid({ rows, variant }: { rows: ToolRow[]; variant: "seller" | "admin" }) {
  const columns = useMemo<ColDef<ToolRow>[]>(
    () => [
      {
        headerName: "Tool",
        field: "name",
        pinned: "left",
        minWidth: 160,
        cellRenderer: ({ data }: ICellRendererParams<ToolRow>) =>
          data ? (
            <a href={variant === "seller" ? `/sell/listings/${data.id}` : `/tools/${data.slug}`} className="font-medium underline-offset-4 hover:underline">
              {data.name}
            </a>
          ) : null,
        tooltip: (p) => (p.data ? `Slug: ${p.data.slug}` : ""),
      },
      ...(variant === "admin" ? [{ headerName: "Seller", field: "sellerName" } satisfies ColDef<ToolRow>] : []),
      {
        headerName: "Status",
        field: "status",
        cellRenderer: ({ value }: ICellRendererParams<ToolRow, ListingStatus>) => (value ? <StatusBadge status={value} /> : null),
        comparator: (a: ListingStatus, b: ListingStatus) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b),
        sort: variant === "admin" ? "asc" : undefined,
      },
      {
        headerName: "Price",
        field: "unitPriceCents",
        valueFormatter: (p) => (p.data ? `${formatPrice(p.data.unitPriceCents)}${p.data.pricingModel === "subscription" ? " / mo" : " / pack"}` : ""),
        filter: "agNumberColumnFilter",
      },
      { headerName: "Calls 24 h", field: "calls24h", valueFormatter: num, filter: "agNumberColumnFilter", sort: variant === "seller" ? "desc" : undefined },
      { headerName: "Calls 7 d", field: "calls7d", valueFormatter: num, filter: "agNumberColumnFilter" },
      { headerName: "Test calls 7 d", field: "testCalls7d", valueFormatter: num, filter: "agNumberColumnFilter", headerTooltip: "Calls made with your free test key" },
      { headerName: "Failure rate 7 d", field: "failureRate7d", cellRenderer: FailureRate, filter: "agNumberColumnFilter", headerTooltip: "Share of calls where the tool returned a 5xx, timed out or was unreachable. These aren't charged." },
      { headerName: "Avg response", field: "avgLatencyMs7d", valueFormatter: ms, filter: "agNumberColumnFilter" },
      { headerName: "p95 response", field: "p95LatencyMs7d", valueFormatter: ms, filter: "agNumberColumnFilter", headerTooltip: "95% of calls in the last 7 days were faster than this" },
      { headerName: "Active keys", field: "activeKeys", valueFormatter: num, filter: "agNumberColumnFilter" },
      { headerName: "Buyers", field: "buyers", valueFormatter: num, filter: "agNumberColumnFilter" },
      variant === "seller"
        ? { headerName: "Your revenue", field: "sellerRevenueCents", valueFormatter: money, filter: "agNumberColumnFilter", headerTooltip: "Completed sales after the 10% platform fee" }
        : { headerName: "Gross sales", field: "grossSalesCents", valueFormatter: money, filter: "agNumberColumnFilter" },
      { headerName: "Calls all time", field: "callsAllTime", valueFormatter: num, filter: "agNumberColumnFilter" },
      {
        headerName: "Last call",
        field: "lastCallAt",
        valueFormatter: (p) => formatAgo(p.value),
        comparator: (a: string | null, b: string | null) => (a ? Date.parse(a) : 0) - (b ? Date.parse(b) : 0),
        filter: false,
      },
    ],
    [variant],
  );
  return (
    <DataGrid
      rows={rows}
      columns={columns}
      label="Tools"
      emptyMessage={variant === "seller" ? "No tools yet. List one to see its numbers here." : "No tools on MrStockd yet."}
    />
  );
}

export function CallsGrid({ rows }: { rows: CallRowData[] }) {
  const columns = useMemo<ColDef<CallRowData>[]>(
    () => [
      {
        headerName: "When",
        field: "at",
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "medium" }) : ""),
        tooltip: (p) => (typeof p.value === "string" ? formatAgo(p.value) : ""),
        sort: "desc",
        filter: false,
      },
      { headerName: "Tool", field: "toolName" },
      {
        headerName: "Result",
        field: "statusCode",
        filter: "agNumberColumnFilter",
        cellRenderer: ({ value }: ICellRendererParams<CallRowData, number>) => {
          if (value === undefined || value === null) return null;
          const failed = value >= 500;
          const client = value >= 400 && !failed;
          return (
            <span className={failed ? "text-red-700 dark:text-red-300" : client ? "text-amber-700 dark:text-amber-300" : ""}>
              {value} {failed ? "Failed" : client ? "Refused" : "OK"}
            </span>
          );
        },
      },
      { headerName: "Response", field: "latencyMs", valueFormatter: ms, filter: "agNumberColumnFilter" },
      { headerName: "Credits", field: "creditsUsed", filter: "agNumberColumnFilter" },
      { headerName: "Key", field: "environment", valueFormatter: (p) => (p.value === "test" ? "Test" : "Buyer") },
    ],
    [],
  );
  return <DataGrid rows={rows} columns={columns} label="Calls" paginate fit="width" emptyMessage="No calls yet." />;
}
