import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { StatusBadge } from "@/components/status-badge";
import { requireSession } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { describePricing } from "@/lib/format";
import { BecomeSellerForm } from "./become-seller-form";

export const metadata: Metadata = { title: "Sell on MrStockd" };

export default async function SellPage() {
  const session = await requireSession();
  const catalog = getCatalog();
  const seller = await catalog.getSeller(session.user.id);

  if (!seller) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight">Sell your AI tool</h1>
            <p className="mt-3 text-muted">
              List your tool once. People and their AI agents find it, pay through PayPal, and call it through MrStockd
              with their own API key. You never handle keys, billing or abuse yourself.
            </p>
          </div>
          <BecomeSellerForm suggestedName={session.user.name} />
        </main>
      </>
    );
  }

  const listings = await catalog.listMyListings(session.user.id);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Selling as {seller.displayName}</p>
            <h1 className="text-3xl font-semibold tracking-tight">Your tools</h1>
          </div>
          <a href="/sell/new" className="inline-flex min-h-11 items-center rounded-full bg-stock px-5 py-2.5 font-medium text-ink">
            List a new tool
          </a>
        </div>

        {listings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-current/20 px-4 py-10 text-center text-muted">
            No tools yet. List your first one to start selling.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-current/10 rounded-xl border border-current/15">
            {listings.map((listing) => (
              <li key={listing.id}>
                <a href={`/sell/listings/${listing.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-4 hover:bg-current/[0.03]">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{listing.name}</span>
                    <span className="block truncate text-sm text-muted">{listing.summary}</span>
                  </span>
                  <span className="text-sm text-muted">{describePricing(listing)}</span>
                  <StatusBadge status={listing.status} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
