import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormSuccess } from "@/components/form";
import { ReviewerSetupHelp } from "@/components/reviewer-setup-help";
import { SiteHeader } from "@/components/site-header";
import { isReviewer, requireSession } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { describePricing } from "@/lib/format";
import { serverEnv } from "@/lib/server-env";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = { title: "Review queue · MrStockd" };

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ done?: string; tool?: string }> }) {
  const session = await requireSession();
  const { done, tool } = await searchParams;
  const confirmation =
    tool && done === "approve" ? `Approved "${tool}". It's live in the store.` : tool && done === "reject" ? `Sent "${tool}" back to the seller with your note.` : null;
  if (!isReviewer(session)) {
    // In production, non-reviewers get a plain 404 so the page isn't advertised.
    if (serverEnv().NODE_ENV === "production") notFound();
    // Locally, explain how to become a reviewer instead of a dead end.
    return (
      <>
        <SiteHeader />
        <ReviewerSetupHelp email={session.user.email} />
      </>
    );
  }

  const queue = await getCatalog().listForReview();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Review queue</h1>
          <p className="mt-2 text-muted">
            {queue.length === 0 ? "Nothing waiting. Nice." : `${queue.length} tool${queue.length === 1 ? "" : "s"} waiting, oldest first.`}
          </p>
        </div>

        <FormSuccess message={confirmation} />

        <ul className="flex flex-col gap-6">
          {queue.map((listing) => (
            <li key={listing.id} className="flex flex-col gap-4 rounded-xl border border-current/15 p-5">
              <div>
                <h2 className="text-lg font-semibold">{listing.name}</h2>
                <p className="text-sm text-muted">
                  by {listing.sellerName} · {describePricing(listing)}
                </p>
              </div>
              <p className="text-sm">{listing.summary}</p>
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">Full description</summary>
                <p className="mt-2 whitespace-pre-line text-muted">{listing.description}</p>
              </details>
              <dl className="grid gap-1 text-sm sm:grid-cols-[max-content_1fr] sm:gap-x-4">
                <dt className="text-muted">Endpoint</dt>
                <dd className="font-mono text-xs break-all">{listing.endpointUrl}</dd>
                <dt className="text-muted">Secret</dt>
                <dd>{listing.hasSecret ? "Provided (encrypted)" : "None"}</dd>
              </dl>
              <ReviewForm listingId={listing.id} />
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
