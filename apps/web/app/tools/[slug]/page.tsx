import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getCatalog } from "@/lib/catalog";
import { describePricing } from "@/lib/format";
import { serverEnv } from "@/lib/server-env";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = await getCatalog().getPublicListing(slug);
  return tool ? { title: `${tool.name} · MrStockd`, description: tool.summary } : { title: "Tool not found · MrStockd" };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = await getCatalog().getPublicListing(slug);
  if (!tool) notFound();

  const callUrl = `${serverEnv().GATEWAY_PUBLIC_URL.replace(/\/$/, "")}/v1/tools/${tool.slug}/`;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12">
        <a href="/tools" className="text-sm text-muted underline-offset-4 hover:underline">
          ← All tools
        </a>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{tool.name}</h1>
          <p className="mt-2 text-lg text-muted">{tool.summary}</p>
          <p className="mt-2 text-sm text-muted">by {tool.sellerName}</p>
        </div>

        <section aria-labelledby="buy-heading" className="flex flex-col gap-4 rounded-xl border border-current/15 p-5">
          <h2 id="buy-heading" className="sr-only">
            Pricing
          </h2>
          <p className="text-2xl font-semibold">{describePricing(tool)}</p>
          <div>
            <button
              type="button"
              disabled
              aria-describedby="checkout-note"
              className="min-h-11 rounded-full bg-stock px-5 py-2.5 font-medium text-ink opacity-60"
            >
              Buy with PayPal
            </button>
            <p id="checkout-note" className="mt-2 text-sm text-muted">
              PayPal checkout is coming next.
            </p>
          </div>
        </section>

        <section aria-labelledby="about-heading" className="flex flex-col gap-3">
          <h2 id="about-heading" className="text-xl font-semibold">
            About this tool
          </h2>
          <p className="whitespace-pre-line">{tool.description}</p>
        </section>

        <section aria-labelledby="use-heading" className="flex flex-col gap-3">
          <h2 id="use-heading" className="text-xl font-semibold">
            How to call it
          </h2>
          <p className="text-sm text-muted">After you buy, call it with your MrStockd API key:</p>
          <pre className="overflow-x-auto rounded-lg border border-current/15 p-4 text-xs">
            <code>{`curl ${callUrl} \\\n  -H "Authorization: Bearer mrs_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"input": "..."}'`}</code>
          </pre>
        </section>
      </main>
    </>
  );
}
