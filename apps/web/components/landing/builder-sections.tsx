import { m } from "motion/react";
import { EarlyAccessForm } from "./early-access-form";
import { PhonePreview } from "./phone-preview";
import { EASE, stagger } from "./motion";

const journey = [
  "List your agent in minutes.",
  "Get reviewed by a person before it goes live.",
  "Get paid through PayPal every time someone uses it.",
];

const listingSteps = [
  "Give us your agent's endpoint and docs.",
  "Set a price per call or subscription.",
  "A reviewer tests it before launch.",
  "Publish and share your store page.",
];

const pricing = [
  { name: "Standard", detail: "10% fee, only when you sell" },
  { name: "Founding builder", detail: "5% fee for your first 12 months" },
  { name: "Failed calls", detail: "If an agent's call fails, you aren't charged for it" },
];

const trustPoints = [
  "Every agent is reviewed before it goes live.",
  "Changing a live endpoint sends it back to review.",
  "Payments through PayPal.",
];

export function BuilderHero({ title = "Ship the agent you built. Get paid when it works." }: { title?: string }) {
  return (
    <section className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-6 px-6 pt-[128px] pb-12 text-center sm:pt-[160px]">
      <p className="text-[12px] font-bold tracking-[1px] text-[var(--l-brand-text)] uppercase">For builders</p>
      <h1 className="text-[clamp(40px,9vw,64px)] leading-[1.05] font-bold tracking-[-0.03em] text-[var(--l-ink)] uppercase">
        {title}
      </h1>
      <p className="max-w-[620px] text-[16px] leading-[26px] text-[var(--l-muted)]">
        List your agent once. People and their AI agents find it, pay through PayPal, and call it through MrStockd. You
        never handle keys or billing.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href="/sell"
          className="l-press l-shine flex h-12 items-center rounded-full bg-[var(--l-brand)] px-7 text-[14px] font-semibold text-white shadow-[0_10px_12px_rgba(234,76,137,0.32)]"
        >
          Start listing
        </a>
        <a href="#pricing-models" className="l-press flex h-12 items-center rounded-full border border-[var(--l-border)] bg-[var(--l-card)] px-7 text-[14px] font-semibold text-[var(--l-ink)]">
          See pricing
        </a>
      </div>
      <p className="text-[12px] text-[var(--l-muted)]">Payments through PayPal · 10% fee, only when you sell</p>
    </section>
  );
}

export function BuilderJourney() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-[64px]">
      <div className="l-card p-6 sm:p-8">
        <p className="text-[12px] font-bold tracking-[1px] text-[var(--l-brand-text)] uppercase">Builder journey</p>
        <h3 className="mt-2 text-[clamp(24px,4vw,32px)] font-bold tracking-[-0.03em] text-[var(--l-ink)]">From code to revenue</h3>
        <ol className="mt-5 grid gap-3">
          {journey.map((j, i) => (
            <li key={j} className="flex items-start gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--l-brand)] text-[13px] font-bold text-white">
                {i + 1}
              </span>
              <span className="text-[14px] leading-[22px] text-[var(--l-ink-2)]">{j}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[11px] text-[var(--l-muted)]">Illustrative preview</p>
      </div>
    </section>
  );
}

export function HowListingWorks() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-[64px]">
      <div className="l-card p-6 sm:p-8">
        <p className="text-[12px] font-bold tracking-[1px] text-[var(--l-brand-text)] uppercase">How listing works</p>
        <h3 className="mt-2 text-[clamp(24px,4vw,32px)] font-bold tracking-[-0.03em] text-[var(--l-ink)]">Four steps</h3>
        <ol className="mt-5 grid gap-3 md:grid-cols-2">
          {listingSteps.map((s, i) => (
            <li key={s} className="flex items-start gap-3 rounded-[16px] bg-[var(--l-inset)] p-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#0d0c22] text-[13px] font-bold text-white">
                {i + 1}
              </span>
              <span className="text-[14px] leading-[22px] text-[var(--l-ink-2)]">{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function PricingModels() {
  return (
    <section id="pricing-models" className="mx-auto w-full max-w-[1200px] px-6 py-[64px]">
      <div className="l-card p-6 sm:p-8">
        <p className="text-[12px] font-bold tracking-[1px] text-[var(--l-brand-text)] uppercase">Pricing models</p>
        <h3 className="mt-2 text-[clamp(24px,4vw,32px)] font-bold tracking-[-0.03em] text-[var(--l-ink)]">You set the price. We handle payments.</h3>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {pricing.map((p) => (
            <div key={p.name} className="rounded-[16px] border border-[var(--l-border)] bg-[var(--l-card)] p-4">
              <p className="text-[15px] font-semibold text-[var(--l-ink)]">{p.name}</p>
              <p className="mt-1 text-[13px] text-[var(--l-muted)]">{p.detail}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-[var(--l-muted)]">Payments through PayPal.</p>
      </div>
    </section>
  );
}

export function BuildingTrust() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-[64px]">
      <div className="l-card p-6 sm:p-8">
        <p className="text-[12px] font-bold tracking-[1px] text-[var(--l-brand-text)] uppercase">Building trust</p>
        <h3 className="mt-2 text-[clamp(24px,4vw,32px)] font-bold tracking-[-0.03em] text-[var(--l-ink)]">Trust is the product</h3>
        <ul className="mt-5 grid gap-3">
          {trustPoints.map((t) => (
            <li key={t} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#d1fae5]">
                <svg viewBox="0 0 24 24" className="size-3.5 text-[#047857]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m5 12 5 5 9-9" />
                </svg>
              </span>
              <span className="text-[14px] leading-[22px] text-[var(--l-ink-2)]">{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function StorefrontPreview() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 py-[64px]">
      <div className="l-card p-6 sm:p-8">
        <p className="text-[12px] font-bold tracking-[1px] text-[var(--l-brand-text)] uppercase">Storefront preview</p>
        <h3 className="mt-2 text-[clamp(24px,4vw,32px)] font-bold tracking-[-0.03em] text-[var(--l-ink)]">Your page, in stock</h3>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <PhonePreview />
          <div className="flex flex-col gap-3">
            <div className="rounded-[16px] bg-[var(--l-inset)] p-4">
              <p className="text-[13px] font-semibold text-[var(--l-ink)]">Illustrative preview</p>
              <p className="mt-1 text-[13px] text-[var(--l-muted)]">This is a placeholder for your storefront. Final layout ships with your listing.</p>
            </div>
            <p className="text-[12px] text-[var(--l-muted)]">Illustrative preview</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FoundingBuilderSignup() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 pb-[96px]">
      <div className="l-card bg-[#0d0c22] p-8 text-center text-white sm:p-12">
        <h3 className="text-[clamp(28px,5vw,44px)] font-bold tracking-[-0.03em]">Founding builder signup</h3>
        <p className="mx-auto mt-2 max-w-[520px] text-[14px] leading-6 text-white/70">
          Founding builders pay 5% for their first 12 months. If an agent's call fails, you aren't charged for it. Every
          agent is reviewed before it goes live. Payments through PayPal.
        </p>
        <div className="mt-6 flex justify-center">
          <EarlyAccessForm defaultRole="build" />
        </div>
      </div>
    </section>
  );
}
