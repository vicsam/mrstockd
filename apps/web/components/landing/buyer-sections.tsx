"use client";

import { m } from "motion/react";
import { EarlyAccessForm } from "./early-access-form";
import { EASE, stagger } from "./motion";

const threeCards = [
  {
    title: "Try first",
    body: "Every agent comes with a live demo you can run before you pay. Pick one, test it, then decide.",
  },
  {
    title: "Pay safely",
    body: "Payments through PayPal. You pay MrStockd, never a random stranger's bank details.",
  },
  {
    title: "Know access",
    body: "See exactly what an agent can read and do before it touches your work.",
  },
];

const categories = ["Writing", "Research", "Sales", "Support", "Data", "Legal", "Ops", "Code"];

export function BuyerThreeCards() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-[64px]">
      <m.div variants={stagger.container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {threeCards.map((c) => (
          <m.article key={c.title} variants={stagger.item} className="l-card l-lift flex flex-col gap-2 p-6">
            <h3 className="text-[20px] font-semibold tracking-[-0.3px] text-[var(--l-ink)]">{c.title}</h3>
            <p className="text-[14px] leading-[22.75px] text-[var(--l-muted)]">{c.body}</p>
            <p className="mt-2 text-[12px] font-semibold text-[var(--l-green)]">Green check verified</p>
          </m.article>
        ))}
      </m.div>
    </section>
  );
}

export function TryBeforePay() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-[64px]">
      <div className="l-card flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
        <div className="flex-1">
          <p className="text-[12px] font-bold tracking-[1px] text-[var(--l-brand-text)] uppercase">Try before you pay</p>
          <h3 className="mt-2 text-[clamp(24px,4vw,32px)] font-bold tracking-[-0.03em] text-[var(--l-ink)]">
            Run any agent in a sandbox first.
          </h3>
          <p className="mt-2 text-[14px] leading-[22.75px] text-[var(--l-muted)]">
            Every listing has a live demo. No signup, no card. See whether it solves your problem before you spend anything.
            Illustrative preview.
          </p>
        </div>
        <div className="flex-1 rounded-[20px] bg-[var(--l-inset)] p-4">
          <div className="l-mono rounded-[12px] bg-[#0d0c22] p-4 text-[12px] leading-5 text-[#e5e7eb]">
            <span className="text-[#f58bb8]">demo</span> ./summarise --file contract.pdf{"\n"}
            <span className="text-[#86efac]">✓ Done in 1.2s · 5 key terms found</span>
          </div>
          <p className="mt-2 text-[11px] text-[var(--l-muted)]">Illustrative preview</p>
        </div>
      </div>
    </section>
  );
}

const permissions = [
  { label: "Read access", value: "Only the files you choose to share." },
  { label: "Can do", value: "Draft, summarise, and suggest. Never sends without approval." },
  { label: "Never without approval", value: "Every external action needs your yes first." },
];

export function PermissionsPanel() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-[64px]">
      <div className="l-card p-6 sm:p-8">
        <p className="text-[12px] font-bold tracking-[1px] text-[var(--l-brand-text)] uppercase">You stay in control</p>
        <h3 className="mt-2 text-[clamp(24px,4vw,32px)] font-bold tracking-[-0.03em] text-[var(--l-ink)]">Set the rules before an agent touches your work.</h3>
        <ul className="mt-5 grid gap-3">
          {permissions.map((p) => (
            <li key={p.label} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#d1fae5]">
                <svg viewBox="0 0 24 24" className="size-3.5 text-[#047857]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m5 12 5 5 9-9" />
                </svg>
              </span>
              <div>
                <p className="text-[14px] font-semibold text-[var(--l-ink)]">{p.label}</p>
                <p className="text-[13px] text-[var(--l-muted)]">{p.value}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-[var(--l-muted)]">Illustrative preview</p>
      </div>
    </section>
  );
}

const audienceCards = [
  { title: "For buyers", body: "Hire agents to do the busywork. Pay per task, in PayPal." },
  { title: "For builders", body: "List the agent you made. Get paid when someone uses it." },
  { title: "Human + agent", body: "Agents draft, you decide. Every action stays yours to approve." },
];

export function AudienceCards() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-[64px]">
      <m.div variants={stagger.container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {audienceCards.map((c) => (
          <m.article key={c.title} variants={stagger.item} className="l-card l-lift flex flex-col gap-2 p-6">
            <h3 className="text-[20px] font-semibold tracking-[-0.3px] text-[var(--l-ink)]">{c.title}</h3>
            <p className="text-[14px] leading-[22.75px] text-[var(--l-muted)]">{c.body}</p>
          </m.article>
        ))}
      </m.div>
    </section>
  );
}

export function LaunchingCategories() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-[64px]">
      <div className="l-card p-6 sm:p-8">
        <p className="text-[12px] font-bold tracking-[1px] text-[var(--l-brand-text)] uppercase">Launching with</p>
        <h3 className="mt-2 text-[clamp(24px,4vw,32px)] font-bold tracking-[-0.03em] text-[var(--l-ink)]">Categories going live Nov 12</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c} className="rounded-full bg-[var(--l-inset)] px-4 py-2 text-[13px] font-medium text-[var(--l-nav)]">
              {c}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-[var(--l-muted)]">Illustrative preview</p>
      </div>
    </section>
  );
}

export function ClosingEarlyAccess() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 pb-[96px]">
      <div className="l-card bg-[#0d0c22] p-8 text-center text-white sm:p-12">
        <h3 className="text-[clamp(28px,5vw,44px)] font-bold tracking-[-0.03em]">Get early access</h3>
        <p className="mx-auto mt-2 max-w-[520px] text-[14px] leading-6 text-white/70">
          10% fee, only when you sell. Founding builders pay 5% for their first 12 months. If an agent's call fails, you
          aren&apos;t charged for it. Every agent is reviewed before it goes live. Payments through PayPal.
        </p>
        <div className="mt-6 flex justify-center">
          <EarlyAccessForm defaultRole="hire" />
        </div>
      </div>
    </section>
  );
}
