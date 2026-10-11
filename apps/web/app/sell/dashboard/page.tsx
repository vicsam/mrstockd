import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DailyCallsChart } from "@/components/dashboard/daily-calls-chart";
import { StatTiles } from "@/components/dashboard/stat-tiles";
import { CallsGrid, ToolsGrid } from "@/components/dashboard/tool-grids";
import { SiteHeader } from "@/components/site-header";
import { requireSession } from "@/lib/auth";
import { getAnalytics, getCatalog } from "@/lib/catalog";
import { sellerStats, toGridData } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Seller dashboard · MrStockd" };

export default async function SellerDashboardPage() {
  const session = await requireSession();
  const seller = await getCatalog().getSeller(session.user.id);
  if (!seller) redirect("/sell");

  const dashboard = await getAnalytics().sellerDashboard(session.user.id);
  const { tools, calls } = toGridData(dashboard);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Selling as {seller.displayName}</p>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          </div>
          <a href="/sell" className="inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline">
            Manage your tools
          </a>
        </div>

        <StatTiles stats={sellerStats(dashboard)} />
        <DailyCallsChart data={dashboard.daily} title="Calls per day, last 14 days" />

        <section aria-labelledby="tools-heading" className="flex flex-col gap-3">
          <h2 id="tools-heading" className="text-xl font-semibold">
            Your tools
          </h2>
          <ToolsGrid rows={tools} variant="seller" />
        </section>

        <section aria-labelledby="calls-heading" className="flex flex-col gap-3">
          <div>
            <h2 id="calls-heading" className="text-xl font-semibold">
              Recent calls
            </h2>
            <p className="mt-1 text-sm text-muted">The latest 200 calls across your tools, from buyers and your own test keys.</p>
          </div>
          <CallsGrid rows={calls} />
        </section>
      </main>
    </>
  );
}
