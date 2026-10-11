import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { requireSession } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { createListingAction } from "../actions";
import { ListingForm } from "../listing-form";

export const metadata: Metadata = { title: "List a new tool · MrStockd" };

export default async function NewListingPage() {
  const session = await requireSession();
  if (!(await getCatalog().getSeller(session.user.id))) redirect("/sell");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12">
        <div>
          <a href="/sell" className="text-sm text-muted underline-offset-4 hover:underline">
            ← Your tools
          </a>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">List a new tool</h1>
          <p className="mt-2 text-muted">It starts as a draft. Submit it for review when it's ready; it goes live once approved.</p>
        </div>
        <ListingForm action={createListingAction} submitLabel="Save draft" />
      </main>
    </>
  );
}
