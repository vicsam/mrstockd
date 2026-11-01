import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { WaitlistGrid } from "@/components/dashboard/waitlist-grid";
import { isReviewer, requireSession } from "@/lib/auth";
import { getWaitlist } from "@/lib/waitlist";
import { serverEnv } from "@/lib/server-env";

export const metadata: Metadata = { title: "Waitlist · MrStockd" };

export default async function WaitlistAdminPage() {
  const session = await requireSession();
  if (!isReviewer(session)) {
    if (serverEnv().NODE_ENV === "production") notFound();
    return null;
  }

  const service = getWaitlist();
  const [entries, counts] = await Promise.all([service.list(), service.counts()]);
  const rows = entries.map((e) => ({
    id: e.id,
    email: e.email,
    role: e.role,
    name: e.name,
    agentDescription: e.agentDescription,
    agentLink: e.agentLink,
    utmSource: e.utmSource,
    utmMedium: e.utmMedium,
    utmCampaign: e.utmCampaign,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12">
        <div>
          <p className="text-sm text-muted">MrStockd</p>
          <h1 className="text-3xl font-semibold tracking-tight">Early access waitlist</h1>
          <p className="mt-2 text-sm text-muted">
            {counts.total} total · {counts.hire} hire · {counts.build} build
          </p>
        </div>
        <WaitlistGrid rows={rows} />
      </main>
    </>
  );
}
