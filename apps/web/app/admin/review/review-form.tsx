"use client";

import { useActionState } from "react";
import { FormError, TextAreaField } from "@/components/form";
import { type ActionState, reviewAction } from "@/app/sell/actions";

export function ReviewForm({ listingId }: { listingId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(reviewAction, {});
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormError message={state.error} />
      <input type="hidden" name="listingId" value={listingId} />
      <TextAreaField
        label="Note to the seller"
        name={`note`}
        id={`note-${listingId}`}
        rows={2}
        defaultValue={state.values?.note}
        error={state.fieldErrors?.note}
        hint="Required when asking for changes."
        maxLength={1000}
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="decision"
          value="approve"
          disabled={pending}
          className="min-h-11 rounded-full bg-stock px-5 py-2.5 font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-stock/60 disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="submit"
          name="decision"
          value="reject"
          disabled={pending}
          className="min-h-11 rounded-full border border-current/20 px-5 py-2.5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-stock/60 disabled:opacity-60"
        >
          Ask for changes
        </button>
      </div>
    </form>
  );
}
