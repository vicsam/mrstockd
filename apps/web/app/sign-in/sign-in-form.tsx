"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { AtIcon, Checkbox, FormAlert, PasswordField, PrimaryButton, TextField } from "@/components/auth/fields";
import { SocialButtons } from "@/components/auth/social-buttons";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/use-hydrated";

/** Only same-site paths are allowed as a return address, never another domain. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

export function SignInForm({ providers, notice, socialError }: { providers: ("google" | "apple")[]; notice: string | null; socialError: string | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(socialError);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
      rememberMe: form.get("remember") === "on",
    });
    if (error) {
      setPending(false);
      setError(error.status === 429 ? "Too many attempts. Wait a minute and try again." : "That email and password don't match.");
      return;
    }
    router.push(safeNext(params.get("next")));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form method="post" onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <FormAlert message={notice} tone="success" />
        <FormAlert message={error} />
        <TextField
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@company.com"
          required
          iconRight={
            <span className="grid size-9 place-items-center" aria-hidden>
              <AtIcon />
            </span>
          }
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          required
          labelAside={
            <a href="/forgot-password" className="text-[13px] font-semibold text-[var(--l-brand-text)] outline-none hover:underline focus-visible:underline">
              Forgot password?
            </a>
          }
        />
        <Checkbox name="remember" label="Remember me for 30 days" defaultChecked />
        <PrimaryButton pending={pending} ready={hydrated}>
          {pending ? "Signing in…" : "Sign in"}
        </PrimaryButton>
      </form>
      <SocialButtons providers={providers} dividerLabel="or sign in with" />
    </div>
  );
}
