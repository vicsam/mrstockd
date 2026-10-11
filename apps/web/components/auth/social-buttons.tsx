"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Divider } from "./fields";

type Provider = "google" | "apple";

/**
 * "Continue with Google / Apple". Renders nothing unless the server has the
 * provider's credentials, so visitors never see a button that can't work.
 */
export function SocialButtons({ providers, dividerLabel }: { providers: Provider[]; dividerLabel: string }) {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (providers.length === 0) return null;

  async function go(provider: Provider) {
    setBusy(provider);
    setError(null);
    const { error } = await authClient.signIn.social({ provider, callbackURL: "/account", newUserCallbackURL: "/welcome", errorCallbackURL: "/sign-in" });
    if (error) {
      setBusy(null);
      setError("That didn't work. Try again, or use your email.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Divider label={dividerLabel} />
      <div className={`grid gap-3 ${providers.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {providers.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            disabled={busy !== null}
            className="flex h-12 items-center justify-center gap-2.5 rounded-[10px] border border-[#e3e1ea] bg-white text-[15px] font-semibold text-[var(--l-ink)] shadow-[0_1px_2px_rgba(13,12,34,0.04)] outline-none transition-colors hover:border-[#cfcbdb] hover:bg-[#fcfbfe] focus-visible:ring-2 focus-visible:ring-[var(--l-violet)] disabled:opacity-60"
          >
            {busy === p ? <span className="size-4 animate-spin rounded-full border-2 border-[#e3e1ea] border-t-[var(--l-ink)]" aria-hidden /> : p === "google" ? <GoogleLogo /> : <AppleLogo />}
            {p === "google" ? "Google" : "Apple"}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-center text-[13px] text-[#b42318]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8s2.3-1.3 3.1-2.5a11 11 0 0 0 1.4-2.9 4.4 4.4 0 0 1-2.6-4.1ZM13.9 5c.7-.9 1.2-2 1-3.2-1 .1-2.2.7-2.9 1.6-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4Z" />
    </svg>
  );
}
