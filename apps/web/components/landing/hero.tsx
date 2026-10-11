"use client";

import { m, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import Image from "next/image";
import { useRef } from "react";
import { hero, heroColumns } from "./content";
import { EASE, Magnetic } from "./motion";

type Column = (typeof heroColumns)[number];
type Card = { src: string; badge: string | null };

/** One builder photo card: white frame, photo, soft fade, verified check. */
function PhotoCard({ card, index, sizes = "119px", className = "" }: { card: Card; index: number; sizes?: string; className?: string }) {
  return (
    <m.div
      whileHover={{ scale: 1.05, rotate: index % 2 ? 1.5 : -1.5, zIndex: 5 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`group relative flex h-[168px] w-[135px] flex-col overflow-clip rounded-[20px] border-2 border-white bg-white p-2 shadow-[0_8px_24px_rgba(13,12,34,0.08)] hover:shadow-[0_20px_40px_rgba(13,12,34,0.16)] ${className}`}
    >
      <div className="relative min-h-px flex-1 overflow-hidden rounded-[16px]">
        <Image
          src={`/landing/${card.src}.png`}
          alt=""
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--l-canvas)] via-transparent via-50% to-transparent opacity-80" />
      {card.badge ? (
        <div className="absolute top-2 left-2 rounded-full bg-white/90 px-[6px] py-[2px] text-[10px] leading-[15px] font-bold text-[#1a1930] backdrop-blur-[2px]">
          {card.badge}
        </div>
      ) : null}
      <m.div
        className="absolute right-[10px] bottom-[10px] grid size-6 place-items-center rounded-full bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.9 + index * 0.08 }}
      >
        <img src="/landing/icons/hero-badge.svg" alt="" width={14} height={14} className="h-[13.125px] w-[13.75px] transition-transform duration-300 group-hover:rotate-[20deg]" />
      </m.div>
    </m.div>
  );
}

/** Card positions inside each 360px-tall column, from the design. */
const layouts: Record<Column["id"], { tops: [number, number]; position: string; dim: boolean }> = {
  "outer-left": { tops: [-20, 232], position: "left-[-40px]", dim: true },
  "inner-left": { tops: [30, 177], position: "left-[112px]", dim: false },
  "inner-right": { tops: [-20, 227], position: "right-[112px]", dim: false },
  "outer-right": { tops: [40, 177], position: "right-[-40px]", dim: true },
};

function FlankColumn({ column, order, px, py, scroll }: { column: Column; order: number; px: MotionValue<number>; py: MotionValue<number>; scroll: MotionValue<number> }) {
  const layout = layouts[column.id];
  const fromLeft = column.side === "left";
  // Pointer parallax (outer columns move more) plus a little scroll drift.
  const x = useTransform(px, (v) => v * -14 * column.depth);
  const yPointer = useTransform(py, (v) => v * -10 * column.depth);
  const yScroll = useTransform(scroll, [0, 1], [0, -90 * column.depth]);
  const y = useTransform(() => yPointer.get() + yScroll.get());
  const outer = column.id.startsWith("outer");

  return (
    <m.div
      aria-hidden
      className={`absolute top-[18.97%] bottom-[18.97%] w-[135px] ${layout.position} ${layout.dim ? "opacity-85" : ""} ${outer ? "hidden lg:block" : "hidden xl:block"}`}
      style={{ x, y }}
    >
      <m.div
        className="relative h-full"
        initial={{ opacity: 0, x: fromLeft ? -80 : 80, rotate: fromLeft ? -6 : 6 }}
        animate={{ opacity: 1, x: 0, rotate: 0 }}
        transition={{ duration: 1.1, ease: EASE, delay: 0.15 + order * 0.08 }}
      >
        <m.div
          className="relative h-full"
          animate={{ y: [0, order % 2 ? 8 : -8, 0] }}
          transition={{ duration: 6 + order, repeat: Infinity, ease: "easeInOut" }}
        >
          {column.cards.map((card, i) => (
            <div key={card.src} className="absolute left-0" style={{ top: layout.tops[i], zIndex: i }}>
              <PhotoCard card={card} index={order * 2 + i} />
            </div>
          ))}
        </m.div>
      </m.div>
    </m.div>
  );
}

/** Below 1024px the columns don't fit beside the headline, so the photos scroll by underneath it instead. */
function PhotoMarquee() {
  const cards: Card[] = heroColumns.flatMap((c): Card[] => [...c.cards]);
  return (
    <div aria-hidden className="relative mt-12 w-screen max-w-[100vw] overflow-hidden lg:hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
      <div className="l-marquee flex w-max gap-4 py-4">
        {[...cards, ...cards].map((card, i) => (
          <div key={`${card.src}-${i}`} className="shrink-0">
            <PhotoCard card={card} index={i} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const px = useSpring(useMotionValue(0), { stiffness: 60, damping: 18 });
  const py = useSpring(useMotionValue(0), { stiffness: 60, damping: 18 });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const words = hero.title.flatMap((line, li) => line.split(" ").map((w, wi) => ({ w, key: `${li}-${wi}`, br: wi === line.split(" ").length - 1 && li < hero.title.length - 1 })));

  return (
    <section
      ref={ref}
      aria-labelledby="hero-title"
      className="relative flex flex-col items-center px-6 pt-[128px] pb-10 sm:px-[48px] sm:pt-[192px] sm:pb-[112px]"
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set(((e.clientX - r.left) / r.width) * 2 - 1);
        py.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      <div className="relative flex w-full max-w-[1320px] items-center justify-center lg:min-h-[580px] lg:py-[104.81px]">
        {heroColumns.map((column, i) => (
          <FlankColumn key={column.id} column={column} order={i} px={px} py={py} scroll={scrollYProgress} />
        ))}

        <div className="relative flex w-full max-w-[640px] flex-col items-center text-center">
          <div className="l-in-pop mb-6" style={{ animationDelay: "0.2s" }}>
            <m.div
              whileHover={{ rotate: -8, scale: 1.08 }}
              transition={{ type: "spring", stiffness: 300, damping: 12 }}
              className="relative grid size-16 place-items-center rounded-[20px] border border-[var(--l-hairline)] bg-[var(--l-card)] drop-shadow-[0_8px_12px_rgba(13,12,34,0.08)]"
            >
              <img src="/landing/icons/hero-glyph.svg" alt="" width={20} height={20} className="size-5" />
              <span className="l-ping absolute -top-1 -right-1 size-4 rounded-full border-2 border-[var(--l-card)] bg-[var(--l-green)]" />
            </m.div>
          </div>

          <p
            style={{ animationDelay: "0.15s" }}
            className="l-in-fade mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--l-hairline)] bg-[var(--l-card)] px-3 py-1.5 text-[12px] leading-4 font-semibold text-[var(--l-ink-2)] shadow-[0_1px_2px_rgba(13,12,34,0.06)]"
          >
            <span className="size-1.5 rounded-full bg-[var(--l-brand)]" aria-hidden />
            {hero.eyebrow}
          </p>

          <h1 id="hero-title" className="text-[clamp(40px,9vw,64px)] leading-[1.05] font-bold tracking-[-0.03em] text-[var(--l-ink)]">
            {words.map(({ w, key, br }, i) => (
              <span key={key}>
                <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                  <span className="l-in-rise inline-block" style={{ animationDelay: `${0.25 + i * 0.07}s` }}>
                    {w}
                  </span>
                </span>
                {/* A real space before the line break, so screen readers don't run words together. */}
                {br ? (
                  <>
                    {" "}
                    <br />
                  </>
                ) : (
                  " "
                )}
              </span>
            ))}
          </h1>

          <p
            style={{ animationDelay: "0.5s" }}
            className="l-in-fade mt-4 max-w-[540px] px-[12.8px] pt-0 pb-8 text-[16px] leading-[26px] tracking-[-0.16px] text-[var(--l-muted)]"
          >
            {hero.subtitle}
          </p>

          <div className="l-in-fade flex flex-col items-center gap-3 sm:flex-row sm:gap-5" style={{ animationDelay: "0.65s" }}>
            <Magnetic>
              <a
                href={hero.cta.href}
                className="l-press l-shine group flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#7c5cfa] to-[#6340e6] px-8 text-[14px] leading-[18px] font-semibold tracking-[0.14px] text-white drop-shadow-[0_10px_12px_rgba(124,92,250,0.32)] outline-none focus-visible:ring-2 focus-visible:ring-[#7c5cfa] focus-visible:ring-offset-2"
              >
                {hero.cta.label}
                <img src="/landing/icons/hero-arrow.svg" alt="" width={12} height={12} className="size-3 transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </Magnetic>
            <a
              href={hero.secondary.href}
              className="l-press group flex h-12 items-center gap-2 rounded-full border border-[var(--l-hairline)] bg-[var(--l-card)] px-6 text-[14px] leading-[18px] font-semibold tracking-[0.14px] text-[var(--l-ink)] shadow-[0_1px_2px_rgba(13,12,34,0.06)] outline-none hover:border-[rgba(175,26,93,0.3)] hover:text-[var(--l-brand-text)] focus-visible:ring-2 focus-visible:ring-[#7c5cfa] focus-visible:ring-offset-2"
            >
              {hero.secondary.label}
            </a>
          </div>
          <a
            href="#how-it-works"
            style={{ animationDelay: "0.8s" }}
            className="l-in-fade mt-6 text-[13px] leading-5 font-medium text-[var(--l-muted)] underline decoration-[var(--l-hairline)] underline-offset-4 outline-none hover:text-[var(--l-ink)] hover:decoration-current focus-visible:text-[var(--l-ink)]"
          >
            New here? See how it works
          </a>
        </div>
      </div>
      <PhotoMarquee />
    </section>
  );
}
