"use client";

import { m } from "motion/react";
import { REPO_URL, earnings, trust, trustNote } from "./content";
import { EASE, Magnetic, spotlight, stagger } from "./motion";

function SectionHeader({ id, title, subtitle, width }: { id: string; title: string; subtitle: string; width: number }) {
  return (
    <m.div
      className="flex flex-col items-center gap-3 text-center"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <h2 id={id} className="text-[clamp(36px,7vw,64px)] leading-[1.25] font-bold tracking-[-0.03em] text-[var(--l-ink)]">
        {title}
      </h2>
      <p className="text-[16px] leading-6 tracking-[-0.16px] text-[var(--l-muted)]" style={{ maxWidth: width }}>
        {subtitle}
      </p>
    </m.div>
  );
}

const iconSizes: Record<string, [number, number]> = {
  "trust-shield": [16, 20],
  "trust-chip": [18, 18],
  "trust-key": [22, 12],
  "trust-star": [20, 19],
};

export function Trust() {
  return (
    <section id="trust" aria-labelledby="trust-title" className="mx-auto flex w-full max-w-[1200px] scroll-mt-28 flex-col items-center gap-8 px-6 pt-[96px] pb-[80px] sm:pt-[128px]">
      <SectionHeader id="trust-title" title="Trust is the product" subtitle="Buyers give agents access to their work. This is how we earn that." width={540} />
      <m.ul
        className="grid w-full grid-cols-1 gap-5 pt-6 sm:grid-cols-2 lg:grid-cols-4"
        variants={stagger.container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
      >
        {trust.map((card) => {
          const [w, h] = iconSizes[card.icon]!;
          return (
            <m.li key={card.icon} variants={stagger.item} onPointerMove={spotlight} className="group l-card l-lift l-spotlight flex flex-col gap-2 p-[25px]">
              <div className="flex items-start justify-between gap-2">
                <m.div
                  className="relative grid size-14 place-items-center overflow-clip rounded-[20px] shadow-[0_8px_24px_rgba(13,12,34,0.08)]"
                  style={{ backgroundColor: card.color }}
                  whileHover={{ rotate: [0, -12, 10, -6, 0], scale: 1.08 }}
                  transition={{ duration: 0.6 }}
                >
                  <img src={`/landing/icons/${card.icon}.svg`} alt="" width={w} height={h} style={{ width: w, height: h }} />
                  <span className="absolute inset-0 bg-gradient-to-b from-white/30 to-white/0" />
                  {/* Glossy sheen that sweeps across on hover */}
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </m.div>
                {card.later ? (
                  <span className="rounded-full bg-[rgba(202,190,255,0.4)] px-2 py-[2px] text-[10px] leading-[15px] font-bold tracking-[0.5px] text-[var(--l-violet-ink)] uppercase">
                    [Later stage]
                  </span>
                ) : null}
              </div>
              <h3 className="pt-4 text-[20px] leading-[25px] font-semibold tracking-[-0.3px] text-[var(--l-ink)]">{card.title.join(" ")}</h3>
              <p className="text-[14px] leading-[22.75px] text-[var(--l-muted)]">{card.body}</p>
            </m.li>
          );
        })}
      </m.ul>
      <m.div
        className="flex w-full max-w-[840px] items-center justify-center gap-3 rounded-[28px] border border-[var(--l-border)] bg-[var(--l-card)] px-[25px] py-[15px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] sm:rounded-full"
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
      >
        <img src="/landing/icons/refund-shield.svg" alt="" width={12} height={15} className="h-[15px] w-3 shrink-0" />
        <p className="text-center text-[14px] leading-5 font-medium text-[var(--l-ink)]">{trustNote}</p>
      </m.div>
    </section>
  );
}

const roleStyles = {
  core: "bg-[#0d0c22] text-white",
  secondary: "bg-[var(--l-violet-soft)] text-[var(--l-ink-2)]",
  later: "bg-[#ede9fe] text-[#5f3bdc]",
} as const;

const deckHref = process.env.NEXT_PUBLIC_CONTACT_EMAIL
  ? `mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}?subject=${encodeURIComponent("MrStockd deck request")}`
  : `${REPO_URL}#readme`;

export function Earnings() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="mx-auto w-full max-w-[1280px] scroll-mt-28 px-4 sm:px-[64px]">
      <m.div
        className="l-card flex flex-col gap-6 px-6 pt-16 pb-10 sm:px-[49px] sm:pt-[97px] sm:pb-[49px]"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <div className="flex flex-col gap-1">
          <h2 id="pricing-title" className="text-[28px] leading-[34px] font-bold tracking-[-0.7px] text-[var(--l-ink)]">
            How the marketplace earns
          </h2>
          <p className="text-[16px] leading-6 tracking-[-0.16px] text-[var(--l-muted)]">Predictable marketplace take rate with zero infrastructure bloat.</p>
        </div>

        <div className="border-y border-[var(--l-border)] pt-[9px] pb-px">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Revenue streams</caption>
            <thead className="hidden sm:table-header-group">
              <tr className="border-b border-[var(--l-border)]">
                {["Stream", "How it works", "Role"].map((h, i) => (
                  <th key={h} scope="col" className={`p-4 text-[12px] leading-4 font-bold tracking-[0.6px] text-[var(--l-muted)] uppercase ${i === 2 ? "text-right" : ""} ${i === 0 ? "w-[28%]" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <m.tbody variants={stagger.container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
              {earnings.map((row) => (
                <m.tr
                  key={row.stream}
                  variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE } } }}
                  className="grid grid-cols-[1fr_auto] border-t border-[var(--l-row)] transition-colors duration-200 first:border-t-0 hover:bg-[var(--l-inset)] sm:table-row"
                >
                  <th scope="row" className="px-4 pt-4 text-[14px] leading-5 font-semibold text-[var(--l-ink)] sm:py-[18.5px]">
                    {row.stream}
                  </th>
                  <td className="col-span-2 row-start-2 px-4 pt-1 pb-4 text-[14px] leading-5 text-[var(--l-muted)] sm:py-[18.5px]">{row.how}</td>
                  <td className="col-start-2 row-start-1 px-4 pt-4 text-right sm:py-[16.5px]">
                    <m.span whileHover={{ scale: 1.08 }} className={`inline-block rounded-full px-3 py-1 text-[12px] leading-4 font-semibold whitespace-nowrap ${roleStyles[row.tone]}`}>
                      {row.role}
                    </m.span>
                  </td>
                </m.tr>
              ))}
            </m.tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {["[market size]", "[raise amount]", "[use of funds]"].map((chip) => (
              <span key={chip} className="l-mono rounded-[8px] border border-[var(--l-border)] bg-[var(--l-inset)] px-[13px] py-[7px] text-[12px] leading-4 text-[var(--l-ink)]">
                {chip}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Magnetic strength={0.15}>
              <a
                href={deckHref}
                className="l-press l-shine flex h-11 items-center rounded-full bg-[#0d0c22] px-5 text-[14px] leading-[18px] font-semibold tracking-[0.14px] text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--l-violet)] focus-visible:ring-offset-2"
              >
                Request the deck
              </a>
            </Magnetic>
            <Magnetic strength={0.15}>
              <a
                href="/sign-up"
                className="l-press flex h-11 items-center rounded-full border border-[var(--l-border)] bg-[var(--l-card)] px-[21px] text-[14px] leading-[18px] font-semibold tracking-[0.14px] text-[var(--l-ink)] outline-none hover:border-[var(--l-violet)] focus-visible:ring-2 focus-visible:ring-[var(--l-violet)]"
              >
                Join the waitlist
              </a>
            </Magnetic>
          </div>
        </div>
        <p className="text-[12px] leading-[18px] text-[var(--l-muted)]">Figures are placeholders and plans are not guarantees.</p>
      </m.div>
    </section>
  );
}
