import { CatalogError, TEST_KEY_CREDITS, TEST_KEY_SUBSCRIPTION_HOURS } from "@mrstockd/catalog";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { StatusBadge } from "@/components/status-badge";
import { isReviewer, requireSession } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { serverEnv } from "@/lib/server-env";
import { updateListingAction } from "../../actions";
import { ListingForm } from "../../listing-form";
import { Activity } from "./activity";
import { StatusControls } from "./status-controls";
import { TestKeyPanel } from "./test-key-panel";

export const metadata: Metadata = { title: "Edit tool · MrStockd" };

const STATUS_HELP = {
  draft: "Only you can see this. Submit it for review when it's ready.",
  in_review: "A reviewer is checking your tool. It isn't visible to buyers yet.",
  live: "Buyers and agents can find, buy and call this tool.",
  rejected: "A reviewer asked for changes. Update the listing and resubmit.",
  paused: "Hidden from the store and calls are refused until you resume.",
} as const;

export default async function EditListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const { created } = await searchParams;

  let listing;
  try {
    listing = await getCatalog().getMyListing(session.user.id, id);
  } catch (error) {
    if (error instanceof CatalogError && error.code === "not_found") notFound();
    throw error;
  }

  const activity = await getCatalog().getToolActivity(session.user.id, listing.id);
  const callUrl = `${serverEnv().GATEWAY_PUBLIC_URL.replace(/\/$/, "")}/v1/tools/${listing.slug}/`;
  const update = updateListingAction.bind(null, listing.id);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-12">
        <div>
          <a href="/sell" className="text-sm text-muted underline-offset-4 hover:underline">
            ← Your tools
          </a>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{listing.name}</h1>
            <StatusBadge status={listing.status} />
          </div>
          {listing.status === "in_review" ? (
            <p className="mt-3 text-sm">
              {isReviewer(session) ? (
                <>
                  You're a reviewer:{" "}
                  <a href="/admin/review" className="font-medium text-stock underline underline-offset-4">
                    open the review queue
                  </a>{" "}
                  to approve it.
                </>
              ) : (
                <>
                  Waiting for a reviewer.{" "}
                  {serverEnv().NODE_ENV !== "production" ? (
                    <a href="/admin/review" className="underline underline-offset-4">
                      Reviewing it yourself locally?
                    </a>
                  ) : null}
                </>
              )}
            </p>
          ) : null}
          {created && listing.status === "draft" ? <p className="mt-3 text-sm">Draft saved. Review the details below, then submit it for review.</p> : null}
        </div>

        <section aria-labelledby="status-heading" className="flex flex-col gap-4 rounded-xl border border-current/15 p-5">
          <h2 id="status-heading" className="font-semibold">
            Status
          </h2>
          <p className="text-sm text-muted">{STATUS_HELP[listing.status]}</p>
          {listing.status === "rejected" && listing.reviewNote ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm">
              <span className="font-medium">Reviewer note: </span>
              {listing.reviewNote}
            </div>
          ) : null}
          <StatusControls listingId={listing.id} status={listing.status} />
          <dl className="grid gap-1 text-sm">
            <dt className="text-muted">Buyers call it at</dt>
            <dd className="font-mono text-xs break-all">{callUrl}…</dd>
          </dl>
        </section>

        <section aria-labelledby="try-heading" className="flex flex-col gap-4 rounded-xl border border-current/15 p-5">
          <div>
            <h2 id="try-heading" className="font-semibold">
              Try it through the gateway
            </h2>
            <p className="mt-1 text-sm text-muted">
              A free test key lets you call your own tool exactly the way buyers will, even before it&apos;s approved.{" "}
              {listing.pricingModel === "credits" ? `It comes with ${TEST_KEY_CREDITS} free calls.` : `It works for ${TEST_KEY_SUBSCRIPTION_HOURS} hours.`}{" "}
              Only you can use it, and only on this tool.
            </p>
          </div>
          <TestKeyPanel
            listingId={listing.id}
            callUrl={callUrl}
            pricingModel={listing.pricingModel}
            activeKey={
              activity.testKey
                ? {
                    prefix: activity.testKey.prefix,
                    creditsRemaining: activity.testKey.creditsRemaining,
                    validUntil: activity.testKey.validUntil?.toISOString() ?? null,
                  }
                : null
            }
          />
        </section>

        <section aria-labelledby="activity-heading" className="flex flex-col gap-4">
          <h2 id="activity-heading" className="text-xl font-semibold">
            Calls
          </h2>
          <Activity activity={activity} now={new Date()} />
        </section>

        <section aria-labelledby="details-heading" className="flex flex-col gap-6">
          <h2 id="details-heading" className="text-xl font-semibold">
            Details
          </h2>
          <ListingForm
            action={update}
            hasSecret={listing.hasSecret}
            submitLabel="Save changes"
            initial={{
              name: listing.name,
              summary: listing.summary,
              description: listing.description,
              endpointUrl: listing.endpointUrl,
              pricingModel: listing.pricingModel,
              price: (listing.unitPriceCents / 100).toFixed(2),
              creditsPerUnit: String(listing.creditsPerUnit),
            }}
          />
        </section>
      </main>
    </>
  );
}
