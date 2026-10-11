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
