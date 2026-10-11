"use client";

import { m } from "motion/react";
import { EASE, Magnetic } from "./motion";

/** The last stop before the footer: one clear next step for each kind of visitor. */
export function ClosingCta() {
  return (
    <section aria-labelledby="closing-title" className="mx-auto w-full max-w-[1200px] px-6 pb-[96px]">
      <m.div
        className="relative isolate overflow-hidden rounded-[32px] bg-[#0d0c22] px-6 py-14 text-center sm:px-12 sm:py-20"
        initial={{ opacity: 0, y: 32, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        {/* Soft brand glows drifting behind the text */}
        <m.span
          aria-hidden
          className="absolute -top-32 -left-24 -z-10 size-[420px] rounded-full bg-[#af1a5d] opacity-40 blur-[120px]"
          animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <m.span
          aria-hidden
          className="absolute -right-24 -bottom-40 -z-10 size-[460px] rounded-full bg-[#7c5cfa] opacity-40 blur-[120px]"
          animate={{ x: [0, -40, 0], y: [0, -20, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <h2 id="closing-title" className="mx-auto max-w-[680px] text-[clamp(32px,6vw,56px)] leading-[1.1] font-bold tracking-[-0.03em] text-white">
          Your next AI tool is already in stock.
        </h2>
        <p className="mx-auto mt-4 max-w-[520px] text-[16px] leading-6 text-white/70">
          Find one and start using it today, or list the tool you built and get paid every time someone uses it.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Magnetic>
            <a
              href="/tools"
              className="l-press l-shine flex h-12 items-center gap-2 rounded-full bg-white px-7 text-[14px] font-semibold text-[#0d0c22] outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0c22]"
            >
              Find a tool <span aria-hidden>→</span>
            </a>
          </Magnetic>
          <a
            href="/sell"
            className="l-press flex h-12 items-center gap-2 rounded-full border border-white/25 px-7 text-[14px] font-semibold text-white outline-none hover:border-white/60 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white"
          >
            List your tool
          </a>
        </div>
        <p className="mt-6 text-[12px] text-white/50">Free to list · 10% fee only when you sell · Paid through PayPal</p>
      </m.div>
    </section>
  );
}
