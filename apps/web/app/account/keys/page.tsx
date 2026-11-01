import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { RevokeKeyButton } from "@/components/revoke-key-button";
import { getOrders } from "@/lib/orders";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Your API keys · MrStockd" };

export default async function AccountKeysPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const keys = await getOrders().listBuyerKeys(session.user.id);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
        <section aria-labelledby="keys-heading" className="flex flex-col gap-2">
          <h1 id="keys-heading" className="text-3xl font-semibold tracking-tight">Your API keys</h1>
          <p className="text-muted">Keys are issued one per purchase. Revoking stops a key immediately.</p>
        </section>

        {keys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-current/20 px-4 py-8 text-center">
            <p className="text-sm text-muted">You don't have any API keys yet.</p>
            <a
              href="/tools"
              className="mt-3 inline-flex min-h-11 items-center rounded-full border border-current/20 px-4 py-2 text-sm font-medium"
            >
              Browse tools
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Your API keys</caption>
              <thead>
                <tr className="border-b border-current/15 text-left">
                  <th scope="col" className="px-3 py-2 font-medium">Tool</th>
                  <th scope="col" className="px-3 py-2 font-medium">Key prefix</th>
                  <th scope="col" className="px-3 py-2 font-medium">Credits left</th>
                  <th scope="col" className="px-3 py-2 font-medium">Last used</th>
                  <th scope="col" className="px-3 py-2 font-medium">Created</th>
                  <th scope="col" className="px-3 py-2 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-current/10">
                    <td className="px-3 py-3">
                      <a href={`/tools/${k.toolSlug}`} className="underline-offset-4 hover:underline">
                        {k.toolName}
                      </a>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{k.prefix}</td>
                    <td className="px-3 py-3">{k.creditsRemaining}</td>
                    <td className="px-3 py-3">{k.lastUsedAt ? k.lastUsedAt.toLocaleString() : "Never"}</td>
                    <td className="px-3 py-3">{k.createdAt.toLocaleDateString()}</td>
                    <td className="px-3 py-3">{k.revokedAt ? "Revoked" : "Active"}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-2">
                        {!k.revokedAt ? <RevokeKeyButton keyId={k.id} /> : null}
                        <a href={`/tools/${k.toolSlug}`} className="text-xs underline-offset-4 hover:underline">
                          Buy more
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <nav aria-label="Back">
          <a
            href="/account"
            className="inline-flex min-h-11 items-center rounded-full border border-current/20 px-4 py-2 text-sm font-medium"
          >
            Back to account
          </a>
        </nav>
      </main>
    </>
  );
}