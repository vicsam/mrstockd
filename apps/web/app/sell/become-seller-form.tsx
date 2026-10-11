"use client";

import { useActionState } from "react";
import { Field, FormError, SubmitButton } from "@/components/form";
import { type ActionState, becomeSellerAction } from "./actions";

export function BecomeSellerForm({ suggestedName }: { suggestedName: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(becomeSellerAction, {});
  return (
    <form action={formAction} className="flex flex-col gap-5 sm:max-w-md" noValidate>
      <FormError message={state.error} />
      <Field
        label="Seller name"
        name="displayName"
        defaultValue={state.values?.displayName ?? suggestedName}
        error={state.fieldErrors?.displayName}
        hint="Shown to buyers on every tool you list. You can use a company name."
        maxLength={60}
        required
      />
      <div>
        <SubmitButton pending={pending}>{pending ? "Setting up…" : "Start selling"}</SubmitButton>
      </div>
    </form>
  );
}
