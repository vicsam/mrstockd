import type { Dashboard } from "@mrstockd/catalog";
import type { Stat } from "@/components/dashboard/stat-tiles";
import type { CallRowData, ToolRow } from "@/components/dashboard/tool-grids";
import { formatPercent, formatPrice } from "./format";

/** Dates become ISO strings for client components. */
export function toGridData(d: Dashboard): { tools: ToolRow[]; calls: CallRowData[] } {
  return {
    tools: d.tools.map((t) => ({ ...t, lastCallAt: t.lastCallAt?.toISOString() ?? null })),
    calls: d.recentCalls.map((c) => ({ ...c, at: c.at.toISOString() })),
  };
}

export function sellerStats(d: Dashboard): Stat[] {
  const t = d.totals;
  return [
    { label: "Calls, last 24 h", value: t.calls24h.toLocaleString("en-US"), note: `${t.calls7d.toLocaleString("en-US")} in 7 days` },
    { label: "Failure rate, 7 d", value: formatPercent(t.failureRate7d), note: "Failed calls aren't charged" },
    { label: "Buyers", value: t.buyers.toLocaleString("en-US"), note: `${t.liveTools} of ${t.tools} tool${t.tools === 1 ? "" : "s"} live` },
    { label: "Your revenue", value: formatPrice(t.sellerRevenueCents), note: "After the 10% platform fee" },
  ];
}

export function adminStats(d: Dashboard): Stat[] {
  const t = d.totals;
  return [
    { label: "Live tools", value: t.liveTools.toLocaleString("en-US"), note: `${t.inReview} waiting for review` },
    { label: "Calls, last 24 h", value: t.calls24h.toLocaleString("en-US"), note: `Failure rate ${formatPercent(t.failureRate7d)} (7 d)` },
    { label: "Gross sales", value: formatPrice(t.grossSalesCents), note: `${t.buyers.toLocaleString("en-US")} buyers` },
    { label: "Platform fees", value: formatPrice(t.platformFeesCents), note: "10% of completed sales" },
  ];
}
