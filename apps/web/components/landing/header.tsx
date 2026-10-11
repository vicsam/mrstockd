"use client";

import { AnimatePresence, m } from "motion/react";
import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { nav } from "./content";
import { EASE, Magnetic } from "./motion";

/**
 * Whether someone is signed in, with one small request instead of loading the
 * whole auth client on the landing page.
 */
function useSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/auth/get-session", { credentials: "same-origin", signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { user?: unknown } | null) => setSignedIn(Boolean(data?.user)))
      .catch(() => {});
    return () => ctrl.abort();
  }, []);
  return signedIn;
}

/** Which landing section is on screen, for highlighting its nav link. */
function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const seen = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        setActive(ids.find((id) => seen.get(id)) ?? null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

const sectionIds = nav.flatMap((n) => (n.section ? [n.section] : []));

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const menuId = useId();
  const active = useActiveSection(sectionIds);
  const signedIn = useSignedIn();

  // The bar stays put while scrolling; it only gets a slightly more solid
  // background once the page has moved, so text behind it stays readable.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // "Marketplace" is the active page at the top; sections take over as you scroll.
  const current = active ?? "marketplace";
  const account = signedIn ? { label: "Dashboard", href: "/sell/dashboard" } : { label: "Sign In", href: "/sign-in" };

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-6">
      <nav
        aria-label="Main"
        style={{ animationDelay: "0.1s" }}
        className={`l-in-drop relative w-full max-w-[760px] rounded-[32px] border border-[var(--l-hairline)] backdrop-blur-[12px] transition-[background-color,box-shadow] duration-300 has-[[aria-expanded=true]]:bg-[var(--l-card)] ${
          scrolled ? "bg-white/90 shadow-[0_12px_32px_-12px_rgba(13,12,34,0.22)]" : "bg-[var(--l-header)] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.12)]"
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-4 px-[25px]">
          <a href="/" className="l-press shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--l-violet)]" aria-label="MrStockd home">
            <Image src="/landing/logo.png" alt="MrStockd" width={106} height={32} priority className="h-8 w-auto" />
          </a>

          <ul className="hidden items-center gap-[28px] lg:flex" onPointerLeave={() => setHovered(null)}>
            {nav.map((item) => {
              const key = item.section ?? "marketplace";
              const isActive = current === key;
              return (
                <li key={item.label} className="relative">
                  <a
                    href={item.href}
                    onPointerEnter={() => setHovered(key)}
                    onFocus={() => setHovered(key)}
                    onBlur={() => setHovered(null)}
                    aria-current={isActive ? (item.section ? "location" : "page") : undefined}
                    className={`relative z-10 block py-2 text-[14px] leading-[18px] tracking-[0.14px] outline-none transition-colors duration-200 focus-visible:text-[var(--l-brand-text)] ${
                      isActive ? "font-semibold text-[var(--l-brand-text)]" : "font-medium text-[var(--l-nav)] hover:text-[var(--l-ink)]"
                    }`}
                  >
                    {item.label}
                  </a>
                  {hovered === key ? (
                    <m.span
                      layoutId="nav-pill"
                      className="absolute -inset-x-3 inset-y-0 rounded-full bg-[rgba(175,26,93,0.08)]"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-[12px]">
            <a
              href={account.href}
              className="hidden text-[14px] leading-[18px] font-semibold tracking-[0.14px] whitespace-nowrap text-[var(--l-ink-2)] outline-none hover:text-[var(--l-brand-text)] focus-visible:text-[var(--l-brand-text)] sm:block"
            >
              {account.label}
            </a>
            <Magnetic strength={0.2} className="hidden sm:block">
              <a
                href="/sell"
                className="l-press l-shine group flex h-10 items-center gap-[6px] rounded-full whitespace-nowrap bg-[var(--l-brand)] px-4 text-[14px] leading-[18px] font-semibold tracking-[0.14px] text-white shadow-[0_10px_12px_rgba(234,76,137,0.32)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--l-violet)] focus-visible:ring-offset-2"
              >
                Deploy Agent
                <img src="/landing/icons/header-arrow.svg" alt="" width={11} height={11} className="size-[10.667px] transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
            </Magnetic>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
              className="l-press -mr-2 grid size-11 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--l-violet)] lg:hidden"
            >
              <span className="relative block h-3 w-5" aria-hidden>
                <m.span className="absolute inset-x-0 top-0 h-0.5 rounded bg-[var(--l-ink)]" animate={open ? { top: 5, rotate: 45 } : { top: 0, rotate: 0 }} />
                <m.span className="absolute inset-x-0 top-[5px] h-0.5 rounded bg-[var(--l-ink)]" animate={{ opacity: open ? 0 : 1 }} />
                <m.span className="absolute inset-x-0 top-[10px] h-0.5 rounded bg-[var(--l-ink)]" animate={open ? { top: 5, rotate: -45 } : { top: 10, rotate: 0 }} />
              </span>
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {open ? (
            <m.div
              id={menuId}
              key="menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="overflow-hidden lg:hidden"
            >
              <m.ul
                className="flex flex-col gap-1 px-[25px] pb-5"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } }}
              >
                {[...nav, account].map((item) => (
                  <m.li key={item.label} variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}>
                    <a
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center text-[15px] font-semibold text-[var(--l-ink-2)] outline-none hover:text-[var(--l-brand-text)] focus-visible:text-[var(--l-brand-text)]"
                    >
                      {item.label}
                    </a>
                  </m.li>
                ))}
                <m.li variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} className="pt-2">
                  <a
                    href="/sell"
                    className="l-press flex h-11 items-center justify-center gap-[6px] rounded-full bg-[var(--l-brand)] text-[14px] font-semibold text-white shadow-[0_10px_12px_rgba(234,76,137,0.32)]"
                  >
                    Deploy Agent
                    <img src="/landing/icons/header-arrow.svg" alt="" width={11} height={11} className="size-[10.667px]" />
                  </a>
                </m.li>
              </m.ul>
            </m.div>
          ) : null}
        </AnimatePresence>
      </nav>
    </header>
  );
}
