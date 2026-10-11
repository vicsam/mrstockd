/** Display helpers, safe to use in both server and client components. */

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

/** "$4.99 for 100 calls" or "$9.00 / month". */
export function describePricing(listing: { pricingModel: "credits" | "subscription"; unitPriceCents: number; creditsPerUnit: number }): string {
  const price = formatPrice(listing.unitPriceCents);
  if (listing.pricingModel === "subscription") return `${price} / month`;
  const calls = listing.creditsPerUnit.toLocaleString("en-US");
  return `${price} for ${calls} call${listing.creditsPerUnit === 1 ? "" : "s"}`;
}

/** "42s ago", "5 min ago", "3 h ago", "2 days ago". */
export function formatAgo(date: Date | string | null, now: Date = new Date()): string {
  if (!date) return "Never";
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

/** 0.0412 → "4.1%". */
export function formatPercent(share: number | null): string {
  if (share === null) return "–";
  const pct = share * 100;
  return `${pct < 10 && pct > 0 ? pct.toFixed(1) : Math.round(pct)}%`;
}
