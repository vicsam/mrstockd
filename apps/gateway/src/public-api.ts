import type { PublicListing, SearchResult } from "@mrstockd/catalog";

/**
 * The read-only slice of the catalog the gateway exposes publicly, so agents
 * (through the MCP server) and buyers' apps can discover tools over HTTP.
 * Only live listings, and only public fields: never endpoints or secrets.
 */
export interface CatalogReader {
  search(params: { query?: string; pricingModel?: "credits" | "subscription"; limit?: number; offset?: number }): Promise<SearchResult>;
  getPublicListing(slug: string): Promise<PublicListing | null>;
}

export interface PublicUrls {
  /** Where people browse and buy, e.g. https://mrstockd.com */
  store: string;
  /** This gateway's public address, e.g. https://api.mrstockd.com */
  gateway: string;
}

const trim = (url: string) => url.replace(/\/+$/, "");

/** The JSON shape of a tool in public API responses. */
export function toPublicTool(listing: PublicListing, urls: PublicUrls, detail = false) {
  return {
    slug: listing.slug,
    name: listing.name,
    summary: listing.summary,
    ...(detail ? { description: listing.description } : {}),
    seller: listing.sellerName,
    pricing:
      listing.pricingModel === "credits"
        ? { model: "credits" as const, priceUsd: listing.unitPriceCents / 100, callsPerPack: listing.creditsPerUnit }
        : { model: "subscription" as const, priceUsd: listing.unitPriceCents / 100, period: "month" as const },
    storeUrl: `${trim(urls.store)}/tools/${listing.slug}`,
    callUrl: `${trim(urls.gateway)}/v1/tools/${listing.slug}/`,
    publishedAt: listing.publishedAt?.toISOString() ?? null,
  };
}

export type PublicTool = ReturnType<typeof toPublicTool>;
