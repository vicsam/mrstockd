"use client";

import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { howItWorks, story, type Step } from "./content";
import { EASE, spotlight } from "./motion";

type Audience = keyof typeof howItWorks;
const audiences: Audience[] = ["buyers", "builders"];

/** Small line icons for the steps, drawn in the brand colour. */
function StepIcon({ name }: { name: Step["icon"] }) {
  const paths: Record<Step["icon"], React.ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    card: (
      <>
        <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
        <path d="M3 10h18M7 15h3" />
      </>
    ),
    key: (
      <>
        <circle cx="8" cy="15" r="4" />
        <path d="m11 12 8.5-8.5M16.5 6.5l2.5 2.5M14 9l2 2" />
      </>
    ),
    plug: (
      <>
        <path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0V8ZM12 17v4" />
      </>
    ),
    check: (
      <>
        <path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6L12 3Z" />
        <path d="m8.5 12 2.5 2.5 4.5-5" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
        <rect x="4" y="8" width="16" height="11" rx="2.5" />
        <path d="M16 13.5h1" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  );
}

/** What the end of each journey looks like: an API call for buyers, a payout for builders. */
function Preview({ audience, gatewayUrl }: { audience: Audience; gatewayUrl: string }) {
  if (audience === "buyers") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="overflow-hidden rounded-[20px] bg-[#0d0c22] p-5 text-left shadow-[0_8px_24px_rgba(13,12,34,0.16)]">
          <p className="mb-3 text-[11px] font-bold tracking-[0.5px] text-white/50 uppercase">From your app</p>
          <pre className="l-mono overflow-x-auto text-[12px] leading-[20px] text-[#e5e7eb]">
            <span className="text-[#f58bb8]">curl</span> -X POST \{"\n"}
            {"  "}{gatewayUrl}/v1/tools/<span className="text-[#cabeff]">pdf-summary</span>/run \{"\n"}
            {"  "}-H <span className="text-[#86efac]">&quot;Authorization: Bearer mrs_…&quot;</span>
          </pre>
        </div>
        <div className="overflow-hidden rounded-[20px] border border-[var(--l-border)] bg-[var(--l-card)] p-5 text-left shadow-[var(--l-shadow-card)]">
          <p className="mb-3 text-[11px] font-bold tracking-[0.5px] text-[var(--l-muted)] uppercase">Or from your AI agent</p>
          <div className="flex flex-col gap-2 text-[13px] leading-5">
            <p className="self-end rounded-[14px] rounded-br-[4px] bg-[var(--l-inset)] px-3 py-2 text-[var(--l-ink)]">Summarise this contract for me.</p>
            <p className="l-mono self-start rounded-[10px] bg-[rgba(124,92,250,0.1)] px-3 py-1.5 text-[11px] text-[var(--l-violet-deep)]">
              using MrStockd · pdf-summary
            </p>
            <p className="self-start rounded-[14px] rounded-bl-[4px] border border-[var(--l-border)] px-3 py-2 text-[var(--l-ink)]">
              Done. Here are the 5 key terms…
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3 rounded-[20px] border border-[var(--l-border)] bg-[var(--l-card)] p-5 text-left shadow-[var(--l-shadow-card)]">
      <p className="text-[11px] font-bold tracking-[0.5px] text-[var(--l-muted)] uppercase">Every sale, paid through PayPal</p>
      {[
        ["A buyer pays", "$10.00", "text-[var(--l-ink)]"],
        ["MrStockd fee (10%)", "−$1.00", "text-[var(--l-muted)]"],
        ["You get", "$9.00", "text-[var(--l-green)] font-bold"],
      ].map(([label, value, tone], i) => (
        <m.div
          key={label}
          className={`flex items-center justify-between gap-4 text-[14px] leading-5 ${i === 2 ? "border-t border-[var(--l-border)] pt-3" : ""}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.25 + i * 0.1 }}
        >
          <span className="text-[var(--l-ink-2)]">{label}</span>
          <span className={`l-mono ${tone}`}>{value}</span>
        </m.div>
      ))}
    </div>
  );
}

export function HowItWorks({ gatewayUrl }: { gatewayUrl: string }) {
  const [audience, setAudience] = useState<Audience>("buyers");
  // Before the first tab switch the steps reveal as they scroll into view;
  // after a switch they appear straight away, since the visitor is looking at them.
  const [switched, setSwitched] = useState(false);
  const choose = (a: Audience) => {
    setAudience(a);
    setSwitched(true);
  };
  const current = howItWorks[audience];

  return (
    <section id="how-it-works" aria-labelledby="how-title" className="mx-auto flex w-full max-w-[1200px] scroll-mt-28 flex-col items-center gap-8 px-6 pt-[48px] pb-[80px] sm:pt-[64px]">
      <m.div
        className="flex max-w-[720px] flex-col items-center gap-4 text-center"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <p className="text-[12px] leading-4 font-bold tracking-[1px] text-[var(--l-brand-text)] uppercase">Why MrStockd</p>
        <p className="text-[clamp(20px,3.2vw,28px)] leading-[1.35] font-semibold tracking-[-0.02em] text-[var(--l-muted)]">
          {story.problem} <span className="text-[var(--l-ink)]">{story.answer}</span>
        </p>
      </m.div>

      <div className="flex flex-col items-center gap-5 pt-10 text-center">
        <h2 id="how-title" className="text-[clamp(36px,7vw,64px)] leading-[1.15] font-bold tracking-[-0.03em] text-[var(--l-ink)]">
          How it works
        </h2>
        <div role="tablist" aria-label="Who is this for?" className="relative flex rounded-full border border-[var(--l-hairline)] bg-[var(--l-card)] p-1 shadow-[0_1px_2px_rgba(13,12,34,0.06)]">
          {audiences.map((a) => {
            const selected = a === audience;
            return (
              <button
                key={a}
                role="tab"
                id={`how-tab-${a}`}
                aria-selected={selected}
                aria-controls="how-panel"
                onClick={() => choose(a)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    const next = audiences[(audiences.indexOf(a) + 1) % audiences.length]!;
                    choose(next);
                    document.getElementById(`how-tab-${next}`)?.focus();
                  }
                }}
                tabIndex={selected ? 0 : -1}
                className={`relative min-h-11 rounded-full px-4 text-[13px] leading-[18px] font-semibold whitespace-nowrap outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--l-violet)] sm:px-5 sm:text-[14px] ${
                  selected ? "text-white" : "text-[var(--l-nav)] hover:text-[var(--l-ink)]"
                }`}
              >
                {selected ? (
                  <m.span layoutId="how-tab" className="absolute inset-0 rounded-full bg-[var(--l-brand)] shadow-[0_6px_12px_rgba(234,76,137,0.28)]" transition={{ type: "spring", stiffness: 420, damping: 36 }} />
                ) : null}
                <span className="relative">{howItWorks[a].label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div id="how-panel" role="tabpanel" aria-labelledby={`how-tab-${audience}`} className="w-full">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={audience}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="flex flex-col gap-6"
          >
            <ol className="relative grid gap-5 md:grid-cols-3">
              {/* Dotted line joining the three steps on wide screens */}
              <span aria-hidden className="pointer-events-none absolute top-[52px] right-[16%] left-[16%] hidden border-t-2 border-dashed border-[rgba(175,26,93,0.18)] md:block" />
              {current.steps.map((step, i) => (
                <m.li
                  key={step.title}
                  onPointerMove={spotlight}
                  className="group l-card l-lift l-spotlight relative flex flex-col gap-3 p-[25px] text-left"
                  initial={{ opacity: 0, y: 20 }}
                  {...(switched ? { animate: { opacity: 1, y: 0 } } : { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.3 } })}
                  transition={{ duration: 0.55, ease: EASE, delay: i * 0.08 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-14 place-items-center rounded-[18px] bg-[rgba(175,26,93,0.08)] text-[var(--l-brand)] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
                      <StepIcon name={step.icon} />
                    </span>
                    <span className="l-mono text-[12px] font-bold text-[var(--l-muted)]">0{i + 1}</span>
                  </div>
                  <h3 className="pt-2 text-[20px] leading-[25px] font-semibold tracking-[-0.3px] text-[var(--l-ink)]">{step.title}</h3>
                  <p className="text-[14px] leading-[22.75px] text-[var(--l-muted)]">{step.body}</p>
                </m.li>
              ))}
            </ol>
            <Preview audience={audience} gatewayUrl={gatewayUrl} />
            <div className="flex justify-center">
              <a
                href={current.cta.href}
                className="l-press l-shine group flex h-12 items-center gap-2 rounded-full bg-[#0d0c22] px-7 text-[14px] leading-[18px] font-semibold tracking-[0.14px] text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--l-violet)] focus-visible:ring-offset-2"
              >
                {current.cta.label}
                <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
                  →
                </span>
              </a>
            </div>
          </m.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
