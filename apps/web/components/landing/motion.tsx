"use client";

import { LazyMotion, MotionConfig, m, type HTMLMotionProps, useMotionValue, useSpring } from "motion/react";
import { type ReactNode, useCallback, useRef } from "react";

const loadFeatures = () => import("./motion-features").then((mod) => mod.default);

/** Motion features for the landing page only; app pages never load them. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {/* Respects the visitor's "reduce motion" setting everywhere below. */}
      <MotionConfig reducedMotion="user" transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}

export const EASE = [0.16, 1, 0.3, 1] as const;

/** Fades and lifts content in when it scrolls into view (threshold 0.15, per the design spec). */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = "div",
  ...rest
}: { children: ReactNode; delay?: number; y?: number; className?: string; as?: "div" | "section" | "li" | "article" } & Omit<HTMLMotionProps<"div">, "children">) {
  const Comp = m[as] as typeof m.div;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/** Container + item variants for staggered entrances (80ms between items, per the design spec). */
export const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.08 } } },
  item: {
    hidden: { opacity: 0, y: 28, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: EASE } },
  },
};

/** Buttons that lean toward the cursor a little, then spring back. */
export function Magnetic({ children, strength = 0.25, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 18, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 18, mass: 0.4 });
  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse" || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      x.set((e.clientX - (r.left + r.width / 2)) * strength);
      y.set((e.clientY - (r.top + r.height / 2)) * strength);
    },
    [strength, x, y],
  );
  const reset = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);
  return (
    <m.div ref={ref} style={{ x, y }} onPointerMove={onMove} onPointerLeave={reset} className={className}>
      {children}
    </m.div>
  );
}

/** Feeds the pointer position into a card's CSS so .l-spotlight can follow it. */
export function spotlight(e: React.PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}
