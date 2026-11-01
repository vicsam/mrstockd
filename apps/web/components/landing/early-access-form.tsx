"use client";

import { joinEarlyAccess } from "@/app/early-access/actions";
import { useState, useTransition } from "react";

type Role = "hire" | "build";

export function EarlyAccessForm({ defaultRole = "hire" }: { defaultRole?: Role }) {
  const [role, setRole] = useState<Role>(defaultRole);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    start(async () => {
      const res = await joinEarlyAccess({ email, role });
      if (res.ok) {
        setMessage(res.message);
        setEmail("");
      } else {
        setError(res.errors?.email ?? res.message);
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-[520px] flex-col gap-3 rounded-[24px] border border-[var(--l-border)] bg-[var(--l-card)] p-4 shadow-[0_8px_24px_rgba(13,12,34,0.08)]"
      aria-label="Early access signup"
    >
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="flex gap-2 rounded-full bg-[var(--l-inset)] p-1">
        <button
          type="button"
          onClick={() => setRole("hire")}
          aria-pressed={role === "hire"}
          className={`flex-1 rounded-full px-3 py-2 text-[13px] font-semibold transition-colors ${
            role === "hire" ? "bg-[var(--l-brand)] text-white" : "text-[var(--l-nav)]"
          }`}
        >
          I want to hire agents
        </button>
        <button
          type="button"
          onClick={() => setRole("build")}
          aria-pressed={role === "build"}
          className={`flex-1 rounded-full px-3 py-2 text-[13px] font-semibold transition-colors ${
            role === "build" ? "bg-[var(--l-brand)] text-white" : "text-[var(--l-nav)]"
          }`}
        >
          I build agents
        </button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="early-access-email">
          Email
        </label>
        <input
          id="early-access-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="h-11 min-w-0 flex-1 rounded-full border border-[var(--l-border)] bg-[var(--l-card)] px-4 text-[14px] text-[var(--l-ink)] outline-none focus:border-[var(--l-brand)] focus:ring-2 focus:ring-[rgba(234,76,137,0.25)]"
        />
        <button
          type="submit"
          disabled={pending}
          className="l-press l-shine h-11 rounded-full bg-[var(--l-brand)] px-6 text-[14px] font-semibold text-white shadow-[0_10px_12px_rgba(234,76,137,0.32)] disabled:opacity-60"
        >
          {pending ? "Joining..." : "Get early access"}
        </button>
      </div>
      {message ? <p className="text-[13px] text-[#047857]">{message}</p> : null}
      {error ? <p className="text-[13px] text-[#b91c1c]">{error}</p> : null}
      <p className="text-[12px] text-[var(--l-muted)]">
        {role === "hire" ? "I want to hire agents" : "I build agents"}. No spam. Unsubscribe anytime.
      </p>
    </form>
  );
}
