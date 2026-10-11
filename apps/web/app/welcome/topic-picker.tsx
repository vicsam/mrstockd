"use client";

import { AnimatePresence, LazyMotion, m, domAnimation } from "motion/react";
import { useActionState, useState } from "react";
import { saveInterests } from "./actions";

export function TopicPicker({ topics, initial, min }: { topics: { id: string; label: string }[]; initial: string[]; min: number }) {
  const [picked, setPicked] = useState<string[]>(initial);
  const [state, action, pending] = useActionState(saveInterests, { error: null });
  const enough = picked.length >= min;

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <LazyMotion features={domAnimation} strict>
      <form action={action} className="mt-8 flex flex-col items-center">
        <fieldset className="w-full">
          <legend className="sr-only">Topics</legend>
          <ul className="flex flex-wrap justify-center gap-x-3 gap-y-3">
            {topics.map((t) => {
              const on = picked.includes(t.id);
              return (
                <li key={t.id}>
                  <label
                    className={`group inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-[background-color,border-color,color,transform] duration-200 select-none active:scale-[0.97] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--l-violet)] has-[:focus-visible]:ring-offset-2 ${
                      on
                        ? "border-[#d6336c] bg-[#d6336c] text-white shadow-[0_6px_12px_-4px_rgba(214,51,108,0.45)]"
                        : "border-[#e3e1ea] bg-[#f8f7fc] text-[var(--l-ink)] hover:border-[#cfcbdb] hover:bg-white"
                    }`}
                  >
                    <input type="checkbox" name="topic" value={t.id} checked={on} onChange={() => toggle(t.id)} className="sr-only" />
                    <AnimatePresence initial={false}>
                      {on ? (
                        <m.svg
                          key="tick"
                          viewBox="0 0 16 16"
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 14, opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          <path d="m3 8.5 3 3 7-7" />
                        </m.svg>
                      ) : null}
                    </AnimatePresence>
                    {t.label}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <p
          aria-live="polite"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-[rgba(26,25,48,0.08)] bg-[#f8f7fc] px-3 py-1 text-[12px] font-semibold text-[var(--l-ink-2)]"
        >
          <span className={`size-1.5 rounded-full ${enough ? "bg-[var(--l-green)]" : "bg-[#d0cdd9]"}`} aria-hidden />
          {picked.length} selected (minimum {min})
        </p>

        {state.error ? (
          <p role="alert" className="mt-4 text-[13px] font-medium text-[#b42318]">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!enough || pending}
          className="group mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0d0c22] text-[15px] font-semibold text-white outline-none transition-[background-color,opacity] hover:bg-[#1f1d3a] focus-visible:ring-2 focus-visible:ring-[var(--l-violet)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Finding tools…" : enough ? "Show me tools" : `Pick ${min - picked.length} more`}
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </button>
        <a href="/tools" className="mt-5 inline-flex min-h-11 items-center text-[14px] text-[var(--l-muted)] outline-none hover:text-[var(--l-ink)] focus-visible:underline">
          Skip for now
        </a>
      </form>
    </LazyMotion>
  );
}
