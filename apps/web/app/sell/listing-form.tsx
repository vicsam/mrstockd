"use client";

import { useActionState, useState } from "react";
import { ChoiceGroup, Field, FormError, FormSuccess, SubmitButton, TextAreaField } from "@/components/form";
import type { ActionState } from "./actions";

export interface ListingFormValues {
  name: string;
  summary: string;
  description: string;
  endpointUrl: string;
  pricingModel: "credits" | "subscription";
  price: string;
  creditsPerUnit: string;
}

const EMPTY: ListingFormValues = {
  name: "",
  summary: "",
  description: "",
  endpointUrl: "",
  pricingModel: "credits",
  price: "",
  creditsPerUnit: "100",
};

export function ListingForm({
  action,
  initial,
  hasSecret = false,
  submitLabel,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  initial?: ListingFormValues;
  hasSecret?: boolean;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  // After a failed submit, refill from what the user typed, not the saved values.
  const values = { ...EMPTY, ...initial, ...(state.values as Partial<ListingFormValues> | undefined) };
  const [pricingModel, setPricingModel] = useState(values.pricingModel);
  const errors = state.fieldErrors ?? {};

  return (
    // key: remount with fresh defaults after each server response.
    <form key={JSON.stringify(state)} action={formAction} className="flex flex-col gap-6" noValidate>
      <FormError message={state.error} />
      <FormSuccess message={state.ok ? state.message : null} />

      <Field label="Tool name" name="name" defaultValue={values.name} error={errors.name} maxLength={80} required />
      <Field
        label="One-line summary"
        name="summary"
        defaultValue={values.summary}
        error={errors.summary}
        hint="Shown in search results. Up to 160 characters."
        maxLength={160}
        required
      />
      <TextAreaField
        label="Description"
        name="description"
        defaultValue={values.description}
        error={errors.description}
        hint="What it does, what to send it, and what comes back. Buyers and AI agents both read this."
        rows={6}
        maxLength={5000}
        required
      />

      <Field
        label="Endpoint URL"
        name="endpointUrl"
        type="url"
        inputMode="url"
        defaultValue={values.endpointUrl}
        error={errors.endpointUrl}
        hint="The base URL MrStockd forwards buyers' calls to, e.g. https://api.yourtool.com/v1. Must be public HTTPS."
        required
      />
      <Field
        label={hasSecret ? "Replace your tool's API secret (optional)" : "Your tool's API secret (optional)"}
        name="upstreamSecret"
        type="password"
        autoComplete="off"
        error={errors.upstreamSecret}
        hint={
          hasSecret
            ? "A secret is saved. Leave this empty to keep it. It's encrypted and never shown again."
            : "Sent to your endpoint as a Bearer token on every call, so only MrStockd can reach it. Encrypted at rest."
        }
      />

      <ChoiceGroup
        legend="How buyers pay"
        name="pricingModel"
        value={pricingModel}
        onChange={(v) => setPricingModel(v as ListingFormValues["pricingModel"])}
        error={errors.pricingModel}
        choices={[
          { value: "credits", label: "Credit packs", description: "Buyers prepay for a number of calls." },
          { value: "subscription", label: "Monthly plan", description: "Unlimited calls for a monthly fee." },
        ]}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label={pricingModel === "subscription" ? "Price per month (USD)" : "Price per pack (USD)"}
          name="price"
          inputMode="decimal"
          defaultValue={values.price}
          error={errors.price}
          hint="Between $0.50 and $1,000."
          required
        />
        {pricingModel === "credits" ? (
          <Field
            label="Calls per pack"
            name="creditsPerUnit"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={values.creditsPerUnit}
            error={errors.creditsPerUnit}
            required
          />
        ) : (
          <input type="hidden" name="creditsPerUnit" value="1" />
        )}
      </div>

      <div>
        <SubmitButton pending={pending}>{pending ? "Saving…" : submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
