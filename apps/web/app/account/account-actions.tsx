"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/form";
import { slugify } from "@mrstockd/core/slug";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/use-hydrated";

export function CreateTeamForm() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    const slug = slugify(trimmed);
    if (!slug) {
      setError("Give your team a name with at least one letter or number.");
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await authClient.organization.create({ name: trimmed, slug });
    setPending(false);
    if (error) {
      setError(
        error.code === "ORGANIZATION_ALREADY_EXISTS" || error.code === "ORGANIZATION_SLUG_ALREADY_TAKEN"
          ? "That team name is taken. Try another."
          : "Could not create the team. Try again.",
      );
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <form method="post" onSubmit={onSubmit} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end" noValidate>
      <div className="flex-1">
        <Field
          label="New team name"
          name="team-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          hint={name.trim() ? `Address: ${slugify(name) || "—"}` : undefined}
          maxLength={60}
          required
        />
      </div>
      <SubmitButton pending={pending} ready={hydrated}>{pending ? "Creating…" : "Create team"}</SubmitButton>
      {error ? (
        <div className="sm:basis-full">
          <FormError message={error} />
        </div>
      ) : null}
    </form>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
      className="min-h-11 rounded-full border border-current/20 px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-stock/60 disabled:opacity-60"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
