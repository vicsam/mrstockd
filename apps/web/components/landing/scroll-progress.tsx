"use client";

import { m, useScroll, useSpring } from "motion/react";

/** Thin brand-coloured bar along the top that fills as you scroll. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return (
    <m.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-[var(--l-brand)] via-[var(--l-pink)] to-[var(--l-violet)]"
      style={{ scaleX }}
    />
  );
}
