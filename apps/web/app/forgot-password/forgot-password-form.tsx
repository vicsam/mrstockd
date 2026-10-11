"use client";

import { type FormEvent, useState } from "react";
import { FormAlert, MailIcon, PrimaryButton, TextField } from "@/components/auth/fields";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/use-hydrated";

export function ForgotPasswordForm({ minutes }: { minutes: number }) {
  const hydrated = useHydrated();
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email")).trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter the email address you signed up with.");
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setPending(false);
    if (error) {
      setError(error.status === 429 ? "Too many requests. Wait a few minutes and try again." : "We couldn't send the link just now. Try again shortly.");
      return;
    }
    // Same message whether or not the account exists, so emails can't be probed.
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <div role="status" className="flex flex-col gap-4">
        <span className="grid size-12 place-items-center rounded-[14px] bg-[#ecfdf3] text-[#067647]">
          <MailIcon />
        </span>
        <h1 className="text-[clamp(28px,4vw,32px)] leading-[1.15] font-bold tracking-[-0.03em] text-[var(--l-ink)]">Check your email</h1>
        <p className="text-[15px] leading-6 text-[var(--l-muted)]">
          If an account exists for <strong className="font-semibold text-[var(--l-ink)]">{sentTo}</strong>, a link to choose a new password is on its way. It works once and expires in {minutes} minutes.
        </p>
        <button type="button" onClick={() => setSentTo(null)} className="w-fit text-[14px] font-semibold text-[var(--l-brand-text)] underline-offset-4 hover:underline">
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-[clamp(28px,4vw,32px)] leading-[1.15] font-bold tracking-[-0.03em] text-[var(--l-ink)]">Reset your password</h1>
      <p className="mt-3 text-[15px] leading-6 text-[var(--l-muted)]">Enter the email you signed up with and we&apos;ll send you a secure link to choose a new password.</p>
      <form method="post" onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <FormAlert message={error} />
        <TextField label="Email address" name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@company.com" required iconLeft={<MailIcon />} />
        <PrimaryButton pending={pending} ready={hydrated}>
          {pending ? "Sending…" : "Send reset link"}
        </PrimaryButton>
      </form>
      <div className="mt-6 flex items-start gap-3 border-t border-[rgba(26,25,48,0.08)] pt-5 text-[13px] leading-5 text-[var(--l-muted)]">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f1eff6] text-[var(--l-ink-2)]" aria-hidden>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l2 2M9 2h6" />
          </svg>
        </span>
        Reset links expire in {minutes} minutes and work only once. Signing in with the new password signs you out everywhere else.
      </div>
    </>
  );
}
