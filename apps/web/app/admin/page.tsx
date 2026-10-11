import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DailyCallsChart } from "@/components/dashboard/daily-calls-chart";
import { StatTiles } from "@/components/dashboard/stat-tiles";
import { CallsGrid, ToolsGrid } from "@/components/dashboard/tool-grids";
import { ReviewerSetupHelp } from "@/components/reviewer-setup-help";
import { SiteHeader } from "@/components/site-header";
import { isReviewer, requireSession } from "@/lib/auth";
import { getAnalytics } from "@/lib/catalog";
import { adminStats, toGridData } from "@/lib/dashboard";
import { serverEnv } from "@/lib/server-env";

export const metadata: Metadata = { title: "Admin · MrStockd" };

export default async function AdminPage() {
  const session = await requireSession();
  if (!isReviewer(session)) {
    if (serverEnv().NODE_ENV === "production") notFound();
    return (
      <>
        <SiteHeader />
        <ReviewerSetupHelp email={session.user.email} />
      </>
    );
  }

  const dashboard = await getAnalytics().adminDashboard();
  const { tools, calls } = toGridData(dashboard);
  const waiting = dashboard.totals.inReview;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">MrStockd</p>
            <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
          </div>
          <a
            href="/admin/review"
            className={
              waiting
                ? "inline-flex min-h-11 items-center rounded-full bg-stock px-5 py-2.5 font-medium text-ink"
                : "inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline"
            }
          >
            {waiting ? `Review ${waiting} tool${waiting === 1 ? "" : "s"}` : "Review queue"}
          </a>
        </div>

        <StatTiles stats={adminStats(dashboard)} />
        <DailyCallsChart data={dashboard.daily} title="Calls per day across MrStockd, last 14 days" />

        <section aria-labelledby="tools-heading" className="flex flex-col gap-3">
          <div>
            <h2 id="tools-heading" className="text-xl font-semibold">
              All tools
            </h2>
            <p className="mt-1 text-sm text-muted">Tools waiting for review are listed first. Sort or filter any column; a failure rate above 10% is marked Failing.</p>
          </div>
          <ToolsGrid rows={tools} variant="admin" />
        </section>

        <section aria-labelledby="calls-heading" className="flex flex-col gap-3">
          <h2 id="calls-heading" className="text-xl font-semibold">
            Recent calls
          </h2>
          <CallsGrid rows={calls} />
        </section>
      </main>
    </>
  );
}
