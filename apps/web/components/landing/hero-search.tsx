"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { EASE } from "./motion";

type Result = { slug: string; name: string; summary: string; price: string; sellerName: string };
type State = { status: "idle" } | { status: "loading" } | { status: "done"; items: Result[]; total: number } | { status: "error" };

const suggestions = ["summarise a PDF", "extract invoice data", "write product copy", "transcribe audio", "find sales leads"];

/**
 * The hero's live search: type a task and real, reviewed tools from the store
 * appear underneath as you type. Without JavaScript it is a plain form that
 * opens the store's search page.
 */
export function HeroSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ status: "idle" });
  const [active, setActive] = useState(-1);
  const [hint, setHint] = useState(0);
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  // Cycle the placeholder through example tasks so visitors see what to type.
  useEffect(() => {
    if (reduce || q) return;
    const t = setInterval(() => setHint((h) => (h + 1) % suggestions.length), 2600);
    return () => clearInterval(t);
  }, [reduce, q]);

  // Search as the visitor types, a moment after they pause.
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setState({ status: "idle" });
      return;
    }
    setState({ status: "loading" });
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/catalog/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((data: { items: Result[]; total: number }) => {
          setState({ status: "done", items: data.items, total: data.total });
          setActive(-1);
        })
        .catch((e: unknown) => {
          if ((e as Error).name !== "AbortError") setState({ status: "error" });
        });
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  // Close when clicking anywhere else.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const items = state.status === "done" ? state.items : [];
  const showPanel = open && (q.trim().length < 2 ? true : state.status !== "idle");
  const allHref = `/tools${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`;

  const pick = (s: string) => {
    setQ(s);
    setOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapRef} className="relative w-full max-w-[560px]">
      <form
        role="search"
        action="/tools"
        onSubmit={(e) => {
          const chosen = items[active];
          if (chosen) {
            e.preventDefault();
            window.location.href = `/tools/${chosen.slug}`;
          }
        }}
      >
        <label htmlFor="hero-search" className="sr-only">
          What do you need an AI tool to do?
        </label>
        <div className="flex items-center gap-2 rounded-full border border-[var(--l-hairline)] bg-[var(--l-card)] p-1.5 pl-5 shadow-[0_18px_40px_-12px_rgba(13,12,34,0.18)] transition-shadow focus-within:shadow-[0_0_0_4px_rgba(124,92,250,0.18),0_18px_40px_-12px_rgba(13,12,34,0.18)]">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0 text-[var(--l-muted)]" aria-hidden>
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input
            ref={inputRef}
            id="hero-search"
            name="q"
            type="search"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            maxLength={100}
            value={q}
            placeholder={`Try “${suggestions[hint]}”`}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "ArrowDown" && items.length) {
                e.preventDefault();
                setOpen(true);
                setActive((a) => (a + 1) % items.length);
              }
              if (e.key === "ArrowUp" && items.length) {
                e.preventDefault();
                setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
              }
            }}
            className="min-h-11 min-w-0 flex-1 bg-transparent text-[15px] text-[var(--l-ink)] outline-none placeholder:text-[var(--l-muted)] [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            type="submit"
            className="l-press l-shine h-11 shrink-0 rounded-full bg-gradient-to-r from-[#7c5cfa] to-[#6340e6] px-5 text-[14px] font-semibold text-white shadow-[0_10px_12px_rgba(124,92,250,0.28)] outline-none focus-visible:ring-2 focus-visible:ring-[#7c5cfa] focus-visible:ring-offset-2 sm:px-6"
          >
            Find a tool
          </button>
        </div>
      </form>

      <AnimatePresence>
        {showPanel ? (
          <m.div
            key="panel"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute inset-x-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-[24px] border border-[var(--l-hairline)] bg-[var(--l-card)] text-left shadow-[0_24px_48px_-12px_rgba(13,12,34,0.25)]"
          >
            {q.trim().length < 2 ? (
              <div className="flex flex-col gap-3 p-4">
                <p className="text-[12px] font-semibold text-[var(--l-muted)]">Try one of these</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => pick(s)}
                      className="l-press min-h-9 rounded-full border border-[var(--l-hairline)] bg-[var(--l-inset)] px-3 text-[13px] font-medium text-[var(--l-ink-2)] outline-none hover:border-[rgba(124,92,250,0.4)] hover:text-[var(--l-violet-deep)] focus-visible:ring-2 focus-visible:ring-[var(--l-violet)]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : state.status === "loading" ? (
              <div className="flex flex-col gap-2 p-3" aria-busy="true">
                {[0, 1].map((i) => (
                  <div key={i} className="flex animate-pulse flex-col gap-2 rounded-[16px] p-3">
                    <div className="h-3.5 w-1/3 rounded bg-[var(--l-inset)]" />
                    <div className="h-3 w-4/5 rounded bg-[var(--l-inset)]" />
                  </div>
                ))}
              </div>
            ) : state.status === "error" ? (
              <p className="p-5 text-[14px] text-[var(--l-muted)]">
                Search is resting for a moment.{" "}
                <a href={allHref} className="font-semibold text-[var(--l-brand-text)] underline-offset-4 hover:underline">
                  Open the store
                </a>
              </p>
            ) : items.length === 0 ? (
              <div className="flex flex-col gap-1 p-5">
                <p className="text-[14px] font-semibold text-[var(--l-ink)]">Nothing in stock for &ldquo;{q.trim()}&rdquo; yet.</p>
                <p className="text-[13px] text-[var(--l-muted)]">
                  Builders are adding tools every week.{" "}
                  <a href="/sell" className="font-semibold text-[var(--l-brand-text)] underline-offset-4 hover:underline">
                    Build this one?
                  </a>
                </p>
              </div>
            ) : (
              <>
                <ul id={listId} role="listbox" aria-label="Matching tools" className="flex flex-col p-2">
                  {items.map((t, i) => (
                    <li key={t.slug} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                      <a
                        href={`/tools/${t.slug}`}
                        onPointerEnter={() => setActive(i)}
                        className={`flex items-start gap-3 rounded-[16px] p-3 outline-none transition-colors ${i === active ? "bg-[var(--l-inset)]" : ""}`}
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-[rgba(124,92,250,0.1)] text-[15px] font-bold text-[var(--l-violet-deep)]">
                          {t.name.trim().charAt(0).toUpperCase()}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                            <span className="truncate text-[15px] font-semibold text-[var(--l-ink)]">{t.name}</span>
                            <span className="shrink-0 text-[12px] font-semibold text-[var(--l-ink-2)] max-sm:order-last max-sm:pt-0.5">{t.price}</span>
                          </span>
                          <span className="line-clamp-1 text-[13px] text-[var(--l-muted)]">{t.summary}</span>
                          {i === active ? (
                            <m.span initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="l-mono overflow-hidden pt-1 text-[11px] text-[var(--l-violet-deep)]">
                              Pay with PayPal → get a key → POST /v1/tools/{t.slug}
                            </m.span>
                          ) : null}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
                <a
                  href={allHref}
                  className="flex min-h-11 items-center justify-between border-t border-[var(--l-border)] px-5 text-[13px] font-semibold text-[var(--l-brand-text)] hover:bg-[var(--l-inset)]"
                >
                  {state.status === "done" && state.total > items.length ? `See all ${state.total} results` : "Open in the store"}
                  <span aria-hidden>→</span>
                </a>
              </>
            )}
          </m.div>
        ) : null}
      </AnimatePresence>
      <p className="sr-only" aria-live="polite">
        {state.status === "done" ? `${state.total} tool${state.total === 1 ? "" : "s"} found` : ""}
      </p>
    </div>
  );
}
