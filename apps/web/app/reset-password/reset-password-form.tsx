"use client";

import { PASSWORD_MIN_LENGTH } from "@mrstockd/auth/constants";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { FormAlert, PasswordField, PrimaryButton } from "@/components/auth/fields";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/use-hydrated";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ password?: string; confirm?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirm = String(form.get("confirm"));
    if (password.length < PASSWORD_MIN_LENGTH) return setFieldError({ password: `Use at least ${PASSWORD_MIN_LENGTH} characters.` });
    if (password !== confirm) return setFieldError({ confirm: "The two passwords don't match." });
    setFieldError({});
    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    if (error) {
      setPending(false);
      setError(error.code === "INVALID_TOKEN" ? "This link has expired or was already used. Ask for a new one." : "We couldn't change your password. Try again.");
      return;
    }
    router.push("/sign-in?reset=done");
  }

  return (
    <>
      <h1 className="text-[clamp(28px,4vw,32px)] leading-[1.15] font-bold tracking-[-0.03em] text-[var(--l-ink)]">Choose a new password</h1>
      <p className="mt-3 text-[15px] leading-6 text-[var(--l-muted)]">You&apos;ll be signed out on every other device once it&apos;s changed.</p>
      <form method="post" onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <FormAlert message={error} />
        <PasswordField
          label="New password"
          name="password"
          autoComplete="new-password"
          labelAside={<span className="text-[12px] font-medium text-[var(--l-muted)]">{PASSWORD_MIN_LENGTH}+ characters</span>}
          error={fieldError.password}
          required
        />
        <PasswordField label="Confirm new password" name="confirm" autoComplete="new-password" error={fieldError.confirm} required />
        <PrimaryButton pending={pending} ready={hydrated}>
          {pending ? "Saving…" : "Save new password"}
        </PrimaryButton>
      </form>
    </>
  );
}
