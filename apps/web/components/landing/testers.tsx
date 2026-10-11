"use client";

import { AnimatePresence, m, type PanInfo } from "motion/react";
import { useCallback, useState } from "react";
import { EASE } from "./motion";

/**
 * The design shows a sample review from an invented person. MrStockd has no
 * testers yet, so these cards invite real ones instead. Replace them with
 * genuine reviews (and set `verified`) once people have used tools.
 */
type Entry = { name: string; role: string; quote: string; meta: [string, string]; badge: string; verified: boolean };

const entries: Entry[] = [
  {
    name: "Your review here",
    role: "Early tester, any tool on MrStockd",
    quote: "We only publish feedback from people who have actually used a tool on MrStockd. Try one and tell us how it went.",
    meta: ["Real reviews only", "Coming soon"],
    badge: "Early access",
    verified: false,
  },
  {
    name: "For builders",
    role: "Invite your first users",
    quote: "Share your tool's page with the people who use it. Their reviews will appear here once they have bought and used it.",
    meta: ["Verified purchases only", "Later stage"],
    badge: "Builders",
    verified: false,
  },
  {
    name: "How reviews work",
    role: "One purchase, one review",
    quote: "Every review will be tied to a PayPal purchase, so ratings can't be bought, swapped or faked.",
    meta: ["Tied to PayPal checkout", "Later stage"],
    badge: "Trust",
    verified: false,
  },
];

function Skeleton({ side }: { side: "left" | "right" }) {
  return (
    <m.div
      aria-hidden
      className={`absolute top-[56px] hidden h-[300px] w-[360px] flex-col gap-4 rounded-[24px] border border-[var(--l-border)] bg-[var(--l-card)] p-[25px] opacity-40 drop-shadow-[0_8px_12px_rgba(13,12,34,0.08)] md:flex ${
        side === "left" ? "left-4" : "right-4"
      }`}
      initial={{ rotate: 0, x: 0 }}
      whileInView={{ rotate: side === "left" ? -8 : 8, x: side === "left" ? -12 : 12 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 1, ease: EASE }}
    >
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-[var(--l-border)]" />
        <div className="flex flex-col gap-1">
          <div className="h-3 w-24 rounded bg-[var(--l-border)]" />
          <div className="h-2 w-16 rounded bg-[var(--l-border)]" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-[10px] w-full rounded bg-[var(--l-border)]" />
        <div className="h-[10px] w-[86%] rounded bg-[var(--l-border)]" />
        <div className="h-[10px] w-[69%] rounded bg-[var(--l-border)]" />
      </div>
    </m.div>
  );
}

export function Testers() {
  const [[index, direction], setPage] = useState<[number, number]>([0, 0]);
  const go = useCallback((d: number) => setPage(([i]) => [(i + d + entries.length) % entries.length, d]), []);
  const entry = entries[index]!;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(-1);
  };

  return (
    <section id="testers" aria-labelledby="testers-title" aria-roledescription="carousel" className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-8 px-6 pt-[96px] pb-[80px] sm:pt-[128px]">
      <m.div
        className="flex flex-col items-center gap-3 text-center"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <h2 id="testers-title" className="text-[clamp(36px,7vw,64px)] leading-[1.25] font-bold tracking-[-0.03em] text-[var(--l-ink)]">
          Words from early testers
        </h2>
        <p className="max-w-[500px] text-[16px] leading-6 tracking-[-0.16px] text-[var(--l-muted)]">What people say after trying the first agents.</p>
      </m.div>

      <div
        className="relative flex min-h-[380px] w-full max-w-[720px] items-center justify-center pt-[70px] pb-[38px] [perspective:1200px]"
        tabIndex={0}
        aria-label="Reviews. Use the left and right arrow keys to browse."
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
      >
        <Skeleton side="left" />
        <Skeleton side="right" />
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <m.article
            key={index}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d > 0 ? 160 : -160, rotateY: d > 0 ? -28 : 28, opacity: 0, scale: 0.92 }),
              center: { x: 0, rotateY: 0, opacity: 1, scale: 1 },
              exit: (d: number) => ({ x: d > 0 ? -160 : 160, rotateY: d > 0 ? 28 : -28, opacity: 0, scale: 0.92 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.55, ease: EASE }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.35}
            onDragEnd={onDragEnd}
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${entries.length}`}
            className="relative flex w-full max-w-[380px] cursor-grab flex-col gap-4 rounded-[24px] border border-[var(--l-border)] bg-[var(--l-card)] p-[29px] drop-shadow-[0_16px_20px_rgba(13,12,34,0.08)] active:cursor-grabbing"
          >
            <div className="absolute -top-[14px] right-6 flex items-center gap-1 rounded-full bg-[var(--l-violet)] px-3 py-1 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]">
              <img src="/landing/icons/envelope.svg" alt="" width={11} height={9} className="h-[9px] w-[10.5px]" />
              <span className="text-[10px] leading-[15px] font-bold tracking-[0.5px] text-white uppercase">{entry.badge}</span>
            </div>
            <div className="flex items-center gap-[14px]">
              <div className="grid size-12 shrink-0 place-items-center rounded-full border border-[var(--l-border)] bg-[var(--l-violet-soft)] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                <img src="/landing/icons/hero-glyph.svg" alt="" width={20} height={20} className="size-5" />
              </div>
              <div>
                <p className="text-[16px] leading-6 font-bold tracking-[-0.16px] text-[var(--l-ink)]">{entry.name}</p>
                <p className="text-[12px] leading-4 text-[var(--l-muted)]">{entry.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-1" aria-label={entry.verified ? "Rated 5 out of 5" : "No ratings yet"}>
              {[0, 1, 2, 3, 4].map((s) => (
                <m.img
                  key={s}
                  src="/landing/icons/star-yellow.svg"
                  alt=""
                  width={12}
                  height={12}
                  className={`h-[11.083px] w-[11.667px] ${entry.verified ? "" : "opacity-25 grayscale"}`}
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 14, delay: 0.15 + s * 0.06 }}
                />
              ))}
              <span className="pl-[6px] text-[12px] leading-4 font-bold text-[var(--l-ink)]">{entry.verified ? "5.0 / 5.0" : "No ratings yet"}</span>
            </div>
            <blockquote className="text-[14px] leading-5 text-[var(--l-ink)] italic">&ldquo;{entry.quote}&rdquo;</blockquote>
            <div className="flex justify-between gap-3 border-t border-[var(--l-border)] pt-[13px]">
              <span className="l-mono text-[11px] leading-[16.5px] text-[var(--l-muted)]">{entry.meta[0]}</span>
              <span className="l-mono text-[11px] leading-[16.5px] text-[var(--l-muted)]">{entry.meta[1]}</span>
            </div>
          </m.article>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous review"
          className="l-press grid size-12 place-items-center rounded-full border border-[var(--l-border)] bg-[var(--l-card)] drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] outline-none hover:-translate-x-0.5 focus-visible:ring-2 focus-visible:ring-[var(--l-violet)]"
        >
          <img src="/landing/icons/chevron-left.svg" alt="" width={6} height={9} className="l-icon-ink h-[9px] w-[5.55px]" />
        </button>
        <div className="flex gap-1.5" aria-hidden>
          {entries.map((_, i) => (
            <m.span key={i} className="h-1.5 rounded-full bg-[var(--l-violet)]" animate={{ width: i === index ? 18 : 6, opacity: i === index ? 1 : 0.3 }} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next review"
          className="l-press grid size-12 place-items-center rounded-full border border-[var(--l-border)] bg-[var(--l-card)] drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] outline-none hover:translate-x-0.5 focus-visible:ring-2 focus-visible:ring-[var(--l-violet)]"
        >
          <img src="/landing/icons/chevron-right.svg" alt="" width={6} height={9} className="l-icon-ink h-[9px] w-[5.55px]" />
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {`Showing ${index + 1} of ${entries.length}: ${entry.name}`}
      </p>
    </section>
  );
}
