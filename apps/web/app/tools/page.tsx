import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { getCatalog } from "@/lib/catalog";
import { describePricing } from "@/lib/format";

export const metadata: Metadata = { title: "Browse AI tools · MrStockd" };

const PAGE_SIZE = 20;

export default async function ToolsPage({ searchParams }: { searchParams: Promise<{ q?: string; pricing?: string; page?: string }> }) {
  const { q = "", pricing, page } = await searchParams;
  const pricingModel = pricing === "credits" || pricing === "subscription" ? pricing : undefined;
  const pageNumber = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

  const { items, total } = await getCatalog().search({
    query: q,
    pricingModel,
    limit: PAGE_SIZE,
    offset: (pageNumber - 1) * PAGE_SIZE,
  });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageLink = (n: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (pricingModel) params.set("pricing", pricingModel);
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return `/tools${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Browse AI tools</h1>
          <p className="mt-2 text-muted">Find a tool, pay with PayPal, and call it with one API key.</p>
        </div>

        <form role="search" action="/tools" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="q" className="text-sm font-medium">
              What do you need a tool for?
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="e.g. extract line items from invoices"
              maxLength={200}
              className="min-h-11 rounded-lg border border-current/20 bg-transparent px-3 py-2 outline-none focus-visible:border-stock focus-visible:ring-2 focus-visible:ring-stock/40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pricing" className="text-sm font-medium">
              Pricing
            </label>
            <select
              id="pricing"
              name="pricing"
              defaultValue={pricingModel ?? ""}
              className="min-h-11 rounded-lg border border-current/20 bg-transparent px-3 py-2 outline-none focus-visible:border-stock focus-visible:ring-2 focus-visible:ring-stock/40"
            >
              <option value="">Any</option>
              <option value="credits">Credit packs</option>
              <option value="subscription">Monthly plan</option>
            </select>
          </div>
          <button type="submit" className="min-h-11 rounded-full bg-stock px-5 py-2.5 font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-stock/60">
            Search
          </button>
        </form>

        <p className="text-sm text-muted" aria-live="polite">
          {q ? `${total} result${total === 1 ? "" : "s"} for "${q}"` : `${total} tool${total === 1 ? "" : "s"} in stock`}
        </p>

        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-current/20 px-4 py-10 text-center text-muted">
            {q ? "Nothing matches that yet. Try fewer or different words." : "No tools are live yet. Check back soon."}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {items.map((tool) => (
              <li key={tool.id}>
                <a href={`/tools/${tool.slug}`} className="flex h-full flex-col gap-2 rounded-xl border border-current/15 p-5 hover:border-current/30">
                  <span className="font-semibold">{tool.name}</span>
                  <span className="text-sm text-muted">{tool.summary}</span>
                  <span className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 text-sm">
                    <span>{describePricing(tool)}</span>
                    <span className="text-muted">by {tool.sellerName}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 ? (
          <nav aria-label="Pages" className="flex items-center justify-between text-sm">
            {pageNumber > 1 ? <a href={pageLink(pageNumber - 1)} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">← Previous</a> : <span />}
            <span className="text-muted">
              Page {pageNumber} of {pages}
            </span>
            {pageNumber < pages ? <a href={pageLink(pageNumber + 1)} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">Next →</a> : <span />}
          </nav>
        ) : null}
      </main>
    </>
  );
}
