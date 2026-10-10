"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/form";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/use-hydrated";

export function SignInForm() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) {
      setError(error.status === 429 ? "Too many attempts. Wait a minute and try again." : "That email and password don't match.");
      return;
    }
    router.push("/account");
    router.refresh();
  }

  return (
    <form method="post" onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormError message={error} />
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <SubmitButton pending={pending} ready={hydrated}>{pending ? "Signing in…" : "Sign in"}</SubmitButton>
    </form>
  );
}
