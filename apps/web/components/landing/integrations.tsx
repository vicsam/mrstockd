"use client";

import { AnimatePresence, m, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { integrations } from "./content";
import { EASE } from "./motion";

type Integration = (typeof integrations)[number];

/** Tile centres on the arc, from the design (inside a 780 × 192 stage). */
const centres: Record<string, { x: number; y: number }> = {
  gmail: { x: 80.95, y: 113.3 },
  slack: { x: 204.55, y: 99.96 },
  calendar: { x: 390, y: 88 },
  notion: { x: 575.45, y: 99.95 },
  zapier: { x: 699.05, y: 113.3 },
};

function Tile({ item, active, onSelect, index, inArc, shown, settled }: { item: Integration; active: boolean; onSelect: () => void; index: number; inArc: boolean; shown: boolean; settled: boolean }) {
  const size = inArc ? (active ? 136 : 120) : 104;
  const c = centres[item.id]!;
  const target = inArc
    ? {
        opacity: active ? 1 : item.outer ? 0.75 : 1,
        left: c.x - size / 2,
        top: c.y - size / 2 - (active && item.id !== "calendar" ? 6 : 0),
        width: size,
        height: size,
        rotate: active ? 0 : item.tilt,
        scale: 1,
      }
    : { opacity: 1, y: 0, width: size, height: size };
  const hidden = inArc
    ? { opacity: 0, left: 390 - size / 2, top: 88 - size / 2, width: size, height: size, rotate: 0, scale: 0.8 }
    : { opacity: 0, y: 16, width: size, height: size };

  return (
    <m.button
      type="button"
      onClick={onSelect}
      onPointerEnter={(e) => e.pointerType === "mouse" && onSelect()}
      onFocus={onSelect}
      aria-pressed={active}
      aria-label={`${item.name}${active ? ", selected" : ""}`}
      className={`group l-press flex flex-col items-center justify-center rounded-[24px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--l-violet)] ${
        inArc ? "absolute" : "relative"
      } ${active ? "z-10 border-2 border-[rgba(175,26,93,0.2)] bg-[var(--l-card)] p-[18px] drop-shadow-[0_16px_20px_rgba(13,12,34,0.08)]" : "border border-[var(--l-border)] bg-[var(--l-inset)] p-[17px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]"}`}
      initial={hidden}
      animate={shown ? target : hidden}
      whileHover={{ scale: 1.06, rotate: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 22, delay: shown && !settled ? index * 0.06 : 0 }}
    >
      <span className="l-float flex flex-col items-center" style={{ animationDelay: `${index * -0.8}s` }}>
        {active ? (
          <span className="mb-2 grid size-12 place-items-center rounded-[16px] bg-[rgba(175,26,93,0.1)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
            <IntegrationIcon item={item} />
          </span>
        ) : (
          <span className="pb-[6px]">
            <IntegrationIcon item={item} />
          </span>
        )}
        <span className={`text-[12px] leading-4 text-[var(--l-ink)] ${active ? "font-extrabold" : "font-bold"}`}>{item.name}</span>
        {active ? (
          <m.span layoutId={`integration-active-${inArc ? "arc" : "grid"}`} className="flex items-center gap-[2px] pt-[2px]">
            <span className="size-[6px] rounded-full bg-[var(--l-green)]" />
            <span className="text-[10px] leading-[15px] font-semibold text-[#059669]">Active</span>
          </m.span>
        ) : null}
      </span>
    </m.button>
  );
}

/** Icons were exported with their tile's tilt baked in; counter-rotate so they follow the tile instead. */
function IntegrationIcon({ item }: { item: Integration }) {
  const dims: Record<string, [number, number]> = { gmail: [30, 27], slack: [29, 29], notion: [24, 28], zapier: [27, 30], calendar: [23, 25] };
  const [w, h] = dims[item.id]!;
  return (
    <img
      src={`/landing/icons/${item.icon}.svg`}
      alt=""
      width={w}
      height={h}
      className={`${item.id === "notion" ? "l-icon-ink" : ""} max-w-none transition-transform duration-300 group-hover:scale-110`}
      style={{ width: w * 0.86, height: h * 0.86, rotate: `${-item.tilt}deg` }}
    />
  );
}

export function Integrations() {
  const [selected, setSelected] = useState<Integration["id"]>("calendar");
  const current = integrations.find((i) => i.id === selected)!;
  const stage = useRef<HTMLDivElement>(null);
  const shown = useInView(stage, { once: true, amount: 0.3 });
  // After the entrance, selection changes respond instantly (no stagger).
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setSettled(true), 900);
    return () => clearTimeout(t);
  }, [shown]);

  return (
    <section id="integrations" aria-labelledby="integrations-title" className="mx-auto w-full max-w-[1280px] scroll-mt-28 px-4 sm:px-[64px]">
      <m.div
        className="l-panel flex flex-col items-center overflow-clip px-6 pt-20 pb-16 sm:pt-[112px] sm:pb-[80px]"
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <m.div
          className="mb-6 grid size-11 place-items-center rounded-[14px] border border-[rgba(242,92,84,0.2)] bg-[rgba(242,92,84,0.1)]"
          whileHover={{ rotate: 180 }}
          transition={{ type: "spring", stiffness: 120, damping: 12 }}
        >
          <img src="/landing/icons/gear.svg" alt="" width={21} height={20} className="h-5 w-[20.1px]" />
        </m.div>
        <h2 id="integrations-title" className="max-w-[620px] pb-12 text-center text-[clamp(28px,5vw,40px)] leading-[1.1] font-bold tracking-[-0.03em] text-[var(--l-ink)]">
          Connect the tools you already use
        </h2>

        {/* Arc on wider screens (scaled to 85% on tablets, per the design spec). */}
        <div ref={stage} className="w-full">
        <div className="hidden w-full max-w-[780px] pb-8 lg:mx-auto lg:block">
          <div className="relative mx-auto h-[192px] w-[780px] origin-top scale-[0.85] xl:scale-100" role="group" aria-label="Integrations">
            {integrations.map((item, i) => (
              <Tile key={item.id} item={item} active={item.id === selected} onSelect={() => setSelected(item.id)} index={i} inArc shown={shown} settled={settled} />
            ))}
          </div>
        </div>
        {/* Wrapped grid on phones. */}
        <div className="flex flex-wrap justify-center gap-3 pb-8 lg:hidden" role="group" aria-label="Integrations">
          {integrations.map((item, i) => (
            <Tile key={item.id} item={item} active={item.id === selected} onSelect={() => setSelected(item.id)} index={i} inArc={false} shown={shown} settled={settled} />
          ))}
        </div>
        </div>

        <div className="flex min-h-[64px] max-w-[480px] flex-col items-center pt-4 text-center" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={current.id}
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: EASE }}
              className="flex flex-col gap-1"
            >
              <p className="text-[16px] leading-6 font-semibold tracking-[-0.16px] text-[var(--l-ink)]">{current.detail.title}</p>
              <p className="text-[14px] leading-5 text-[var(--l-muted)]">{current.detail.body}</p>
            </m.div>
          </AnimatePresence>
        </div>
        <p className="pt-8 text-center text-[12px] leading-[18px] text-[rgba(107,114,128,0.6)]">Placeholder integrations, to be confirmed.</p>
      </m.div>
    </section>
  );
}
