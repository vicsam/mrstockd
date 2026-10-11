"use client";

import { AnimatePresence, m, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { REPO_URL, footerColumns } from "./content";
import { EASE } from "./motion";

function ShareButton() {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: "MrStockd", text: "AI tools, in stock.", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Share sheet dismissed or clipboard blocked: nothing to do.
    }
  };
  return (
    <div className="relative">
      <button type="button" onClick={share} aria-label="Share MrStockd" className="l-press grid size-10 place-items-center rounded-[12px] bg-[var(--l-inset)] outline-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[var(--l-violet)]">
        <img src="/landing/icons/social-share.svg" alt="" width={14} height={15} className="l-icon-ink h-[15px] w-[13.5px]" />
      </button>
      <AnimatePresence>
        {copied ? (
          <m.span
            role="status"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-8 right-0 rounded-md bg-[#0d0c22] px-2 py-1 text-[11px] whitespace-nowrap text-white"
          >
            Link copied
          </m.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const socials = [
  { label: "MrStockd home", href: "/", icon: "social-globe", w: 15, h: 15 },
  { label: "Source code on GitHub", href: REPO_URL, icon: "social-terminal", w: 15, h: 12 },
  { label: "Connect an AI agent (MCP)", href: `${REPO_URL}#using-mrstockd-from-an-ai-agent-mcp`, icon: "social-hub", w: 18, h: 17.25 },
];

export function LandingFooter({ status, statusUrl }: { status: "ok" | "down" | "unknown"; statusUrl: string }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const rise = useTransform(scrollYProgress, [0.4, 1], ["40%", "0%"]);
  const statusText = status === "ok" ? "All Systems Operational" : status === "down" ? "Partial outage" : "Status unavailable";

  return (
    <footer ref={ref} className="mx-auto w-full max-w-[1280px] px-4 pb-10 sm:px-[64px]">
      <m.div
        className="l-panel flex flex-col gap-2 overflow-clip px-6 pt-16 pb-[17px] sm:px-[49px] sm:pt-[97px]"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <div className="grid grid-cols-1 gap-10 pb-14 lg:grid-cols-12">
          <div className="flex flex-col items-start gap-4 lg:col-span-4">
            <p className="max-w-[325px] text-[18px] leading-[22.5px] font-bold tracking-[-0.18px] text-[var(--l-ink-2)]">The trusted place to buy and sell AI agents.</p>
            {/* changed from design: shows the gateway's real status instead of a fixed "99.98% SLA". */}
            <a href={statusUrl} className="flex items-center gap-2 rounded-full bg-[var(--l-inset)] px-3 py-[6px] outline-none hover:ring-1 hover:ring-[var(--l-border)] focus-visible:ring-2 focus-visible:ring-[var(--l-violet)]">
              <span className={`relative size-2 rounded-full ${status === "ok" ? "l-ping bg-[var(--l-green)]" : status === "down" ? "bg-amber-500" : "bg-gray-400"}`} />
              <span className="l-mono text-[12px] leading-4 text-[var(--l-ink-2)]">{statusText}</span>
            </a>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:col-span-6">
            {footerColumns.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <p className="text-[12px] leading-4 font-bold tracking-[0.6px] text-[var(--l-ink-2)] uppercase">{col.title}</p>
                <ul className="flex flex-col gap-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href === "status" ? statusUrl : link.href}
                        className="group relative inline-block text-[12px] leading-4 font-medium text-[var(--l-nav)] outline-none hover:text-[var(--l-brand-text)] focus-visible:text-[var(--l-brand-text)]"
                      >
                        {link.label}
                        <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-300 group-hover:scale-x-100" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="flex flex-col items-start lg:col-span-2 lg:items-end">
            <p className="pb-3 text-[12px] leading-4 font-bold tracking-[0.6px] text-[var(--l-ink-2)] uppercase">Follow us</p>
            <div className="grid grid-cols-2 gap-2">
              {socials.map((s) => (
                <a
                  key={s.icon}
                  href={s.href}
                  aria-label={s.label}
                  className="l-press grid size-10 place-items-center rounded-[12px] bg-[var(--l-inset)] outline-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[var(--l-violet)]"
                >
                  <img src={`/landing/icons/${s.icon}.svg`} alt="" width={s.w} height={s.h} className="l-icon-ink" style={{ width: s.w, height: s.h }} />
                </a>
              ))}
              <ShareButton />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--l-border)] pt-[25px] pb-4 sm:flex-row sm:items-center sm:justify-between">
          {/* changed from design: MrStockd's name and year; it is open source (AGPL-3.0). */}
          <p className="text-[12px] leading-4 text-[var(--l-muted)]">
            Figures and roadmap are forward-looking statements. © {new Date().getFullYear()} MrStockd. Open source under AGPL-3.0.
          </p>
          <div className="flex gap-4">
            <a href={`${REPO_URL}#security-principles`} className="text-[12px] leading-4 text-[var(--l-muted)] hover:text-[var(--l-brand-text)]">
              Privacy Framework
            </a>
            <a href={`${REPO_URL}#security-principles`} className="text-[12px] leading-4 text-[var(--l-muted)] hover:text-[var(--l-brand-text)]">
              Security Protocols
            </a>
          </div>
        </div>

        {/* Giant pink wordmark, cropped and fading along the bottom edge. */}
        <div aria-hidden className="l-wordmark-mask relative h-[clamp(64px,13vw,156px)] overflow-clip">
          <m.p
            style={{ y: rise }}
            className="absolute inset-x-0 top-[clamp(8px,2vw,24px)] text-center text-[clamp(72px,17.5vw,224px)] leading-none font-extrabold tracking-[-0.05em] whitespace-nowrap text-[var(--l-pink)] opacity-15"
          >
            mrstockd.
          </m.p>
        </div>
      </m.div>
    </footer>
  );
}
