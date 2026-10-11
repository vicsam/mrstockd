import type { ListingStatus } from "@mrstockd/catalog";

const LABELS: Record<ListingStatus, { text: string; className: string }> = {
  draft: { text: "Draft", className: "border-current/25 text-muted" },
  in_review: { text: "In review", className: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300" },
  live: { text: "Live", className: "border-stock/50 bg-stock/15 text-ink dark:text-paper" },
  rejected: { text: "Needs changes", className: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300" },
  paused: { text: "Paused", className: "border-current/25 text-muted" },
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  const { text, className } = LABELS[status];
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${className}`}>{text}</span>;
}
