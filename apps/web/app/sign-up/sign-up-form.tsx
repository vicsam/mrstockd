"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { FormAlert, PasswordField, PrimaryButton, TextField } from "@/components/auth/fields";
import { SocialButtons } from "@/components/auth/social-buttons";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/use-hydrated";

const MIN_PASSWORD = 10;

function signUpErrorMessage(status: number, code?: string): string {
  if (status === 429) return "Too many attempts. Wait a few minutes and try again.";
  switch (code) {
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with this email already exists. Try signing in.";
    case "INVALID_EMAIL":
      return "Enter a valid email address.";
    case "PASSWORD_TOO_SHORT":
      return `Use at least ${MIN_PASSWORD} characters for your password.`;
    case "PASSWORD_TOO_LONG":
      return "That password is too long. Use 128 characters or fewer.";
    default:
      return "Could not create your account. Try again.";
  }
}

export function SignUpForm({ providers }: { providers: ("google" | "apple")[] }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string>();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password.length < MIN_PASSWORD) {
      setPasswordError(`Use at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setPasswordError(undefined);
    setPending(true);
    setError(null);
    const { error } = await authClient.signUp.email({
      name: String(form.get("name")).trim(),
      email: String(form.get("email")).trim(),
      password,
    });
    if (error) {
      setPending(false);
      setError(signUpErrorMessage(error.status, error.code));
      return;
    }
    // New accounts pick what they want to automate first.
    router.push("/welcome");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form method="post" onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <FormAlert message={error} />
        <TextField label="Full name" name="name" autoComplete="name" placeholder="Ada Lovelace" required />
        <TextField label="Email address" name="email" type="email" autoComplete="email" inputMode="email" placeholder="ada@company.com" required />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          placeholder="Choose a password"
          labelAside={<span className="text-[12px] font-medium text-[var(--l-muted)]">{MIN_PASSWORD}+ characters</span>}
          error={passwordError}
          required
        />
        <PrimaryButton pending={pending} ready={hydrated}>
          {pending ? "Creating your account…" : "Continue"}
        </PrimaryButton>
      </form>
      <SocialButtons providers={providers} dividerLabel="OR CONTINUE WITH" />
    </div>
  );
}
