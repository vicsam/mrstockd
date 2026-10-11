"use client";

import { AnimatePresence, m } from "motion/react";
import { useId, useState } from "react";
import { faqs } from "./content";
import { EASE } from "./motion";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <section id="faq" aria-labelledby="faq-title" className="mx-auto flex w-full max-w-[820px] scroll-mt-28 flex-col items-center gap-8 px-6 pt-[72px] pb-[96px]">
      <h2 id="faq-title" className="text-center text-[clamp(32px,6vw,48px)] leading-[1.2] font-bold tracking-[-0.03em] text-[var(--l-ink)]">
        Questions, answered
      </h2>
      <ul className="flex w-full flex-col gap-3">
        {faqs.map((item, i) => {
          const isOpen = open === i;
          const panelId = `${baseId}-panel-${i}`;
          const buttonId = `${baseId}-button-${i}`;
          return (
            <li key={item.q} className={`l-card overflow-hidden transition-shadow duration-300 ${isOpen ? "shadow-[0_16px_32px_rgba(13,12,34,0.1)]" : ""}`}>
              <h3>
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex min-h-14 w-full items-center justify-between gap-4 px-6 py-4 text-left text-[16px] leading-6 font-semibold tracking-[-0.16px] text-[var(--l-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--l-violet)] focus-visible:ring-inset"
                >
                  {item.q}
                  <m.span
                    aria-hidden
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 26 }}
                    className={`grid size-8 shrink-0 place-items-center rounded-full text-[20px] leading-none transition-colors duration-200 ${
                      isOpen ? "bg-[var(--l-brand)] text-white" : "bg-[var(--l-inset)] text-[var(--l-ink)]"
                    }`}
                  >
                    +
                  </m.span>
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <m.div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    key="panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    <p className="px-6 pb-5 text-[15px] leading-[24px] text-[var(--l-muted)]">{item.a}</p>
                  </m.div>
                ) : null}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
