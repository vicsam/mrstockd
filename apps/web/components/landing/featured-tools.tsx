"use client";

import { m } from "motion/react";
import { EASE, spotlight, stagger } from "./motion";

import type { ToolSummary } from "@/lib/marketplace";

export type FeaturedTool = ToolSummary;

/**
 * Real tools from the store, newest first. Replaces the design's tester quotes: live listings say more
 * about the product than invented reviews.
 */
export function FeaturedTools({ tools, total }: { tools: FeaturedTool[]; total: number }) {
  return (
    <section id="featured" aria-labelledby="featured-title" className="mx-auto flex w-full max-w-[1200px] scroll-mt-28 flex-col items-center gap-8 px-6 pt-[96px] pb-[80px] sm:pt-[128px]">
      <m.div
        className="flex flex-col items-center gap-3 text-center"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <h2 id="featured-title" className="text-[clamp(36px,7vw,64px)] leading-[1.15] font-bold tracking-[-0.03em] text-[var(--l-ink)]">
          In stock now
        </h2>
        <p className="max-w-[520px] text-[16px] leading-6 tracking-[-0.16px] text-[var(--l-muted)]">
          {total > 0
            ? `${total} reviewed tool${total === 1 ? "" : "s"} you can buy and call today.`
            : "The first tools are going through review. List yours and it could be here."}
        </p>
      </m.div>


      {tools.length > 0 ? (
        <m.ul
          className="grid w-full grid-cols-1 gap-5 pt-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={stagger.container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
        >
          {tools.map((tool) => (
            <m.li key={tool.slug} variants={stagger.item}>
              <a
                href={`/tools/${tool.slug}`}
                onPointerMove={spotlight}
                className="group l-card l-lift l-spotlight flex h-full flex-col gap-3 p-6 outline-none focus-visible:ring-2 focus-visible:ring-[var(--l-violet)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-[rgba(175,26,93,0.08)] text-[16px] font-bold text-[var(--l-brand)]">
                    {tool.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="rounded-full bg-[rgba(16,185,129,0.12)] px-2 py-[2px] text-[10px] leading-[15px] font-bold tracking-[0.5px] text-[#047857] uppercase">
                    Reviewed
                  </span>
                </div>
                <h3 className="text-[18px] leading-6 font-semibold tracking-[-0.2px] text-[var(--l-ink)]">{tool.name}</h3>
                <p className="line-clamp-3 text-[14px] leading-[22px] text-[var(--l-muted)]">{tool.summary}</p>
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--l-border)] pt-3 text-[13px]">
                  <span className="font-semibold text-[var(--l-ink)]">{tool.price}</span>
                  <span className="truncate text-[var(--l-muted)]">by {tool.sellerName}</span>
                </div>
              </a>
            </m.li>
          ))}
        </m.ul>
      ) : (
        <m.a
          href="/sell"
          className="l-card l-lift flex w-full max-w-[620px] flex-col items-center gap-2 border-dashed p-8 text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <span className="text-[18px] font-semibold text-[var(--l-ink)]">Be one of the first builders</span>
          <span className="text-[14px] text-[var(--l-muted)]">List your tool now and it will appear here once it passes review.</span>
        </m.a>
      )}

      {total > tools.length ? (
        <a href="/tools" className="l-press text-[14px] font-semibold text-[var(--l-brand-text)] underline-offset-4 outline-none hover:underline focus-visible:underline">
          See all {total} tools →
        </a>
      ) : null}
    </section>
  );
}
