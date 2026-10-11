"use client";

import type { ListingStatus } from "@mrstockd/catalog";
import { useActionState } from "react";
import { FormError, FormSuccess } from "@/components/form";
import { type ActionState, listingStatusAction } from "../../actions";

const ACTIONS: Record<ListingStatus, { action: string; label: string; primary?: boolean }[]> = {
  draft: [{ action: "submit", label: "Submit for review", primary: true }],
  rejected: [{ action: "submit", label: "Resubmit for review", primary: true }],
  in_review: [{ action: "withdraw", label: "Withdraw from review" }],
  live: [{ action: "pause", label: "Pause listing" }],
  paused: [{ action: "resume", label: "Resume listing", primary: true }],
};

export function StatusControls({ listingId, status }: { listingId: string; status: ListingStatus }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(listingStatusAction, {});
  return (
    <div className="flex flex-col gap-3">
      <FormError message={state.error} />
      <FormSuccess message={state.ok ? state.message : null} />
      <div className="flex flex-wrap gap-3">
        {ACTIONS[status].map(({ action, label, primary }) => (
          <form key={action} action={formAction}>
            <input type="hidden" name="listingId" value={listingId} />
            <input type="hidden" name="action" value={action} />
            <button
              type="submit"
              disabled={pending}
              className={
                primary
                  ? "min-h-11 rounded-full bg-stock px-5 py-2.5 font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-stock/60 disabled:opacity-60"
                  : "min-h-11 rounded-full border border-current/20 px-5 py-2.5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-stock/60 disabled:opacity-60"
              }
            >
              {label}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
