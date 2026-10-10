"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/form";
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

export function SignUpForm() {
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
    setPending(false);
    if (error) {
      setError(signUpErrorMessage(error.status, error.code));
      return;
    }
    router.push("/account");
    router.refresh();
  }

  return (
    <form method="post" onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormError message={error} />
      <Field label="Name" name="name" autoComplete="name" required />
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD}
        hint={`At least ${MIN_PASSWORD} characters.`}
        error={passwordError}
        required
      />
      <SubmitButton pending={pending} ready={hydrated}>{pending ? "Creating account…" : "Create account"}</SubmitButton>
    </form>
  );
}
