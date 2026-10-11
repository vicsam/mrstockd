"use client";

import { animate, m, useInView } from "motion/react";
import Image from "next/image";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { EASE, spotlight, stagger } from "./motion";

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <m.article
      variants={stagger.item}
      onPointerMove={spotlight}
      className={`l-card l-lift l-spotlight flex flex-col p-6 sm:p-[33px] ${className}`}
    >
      {children}
    </m.article>
  );
}

function CardInfo({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-[5.375px]">
      <h3 className="text-[20px] leading-[26px] font-semibold tracking-[-0.3px] text-[var(--l-ink)]">{title}</h3>
      <p className="text-[14px] leading-[22.75px] text-[var(--l-muted)]">{body}</p>
    </div>
  );
}

function LaterStage() {
  return (
    <span className="rounded-full bg-[rgba(202,190,255,0.4)] px-2 py-[2px] text-[10px] leading-[15px] font-bold tracking-[0.5px] whitespace-nowrap text-[var(--l-violet-ink)] uppercase">
      [Later stage]
    </span>
  );
}

/* ---------------- Card 1: for buyers ---------------- */

function DemoButton() {
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  useEffect(() => {
    if (state === "running") {
      const t = setTimeout(() => setState("done"), 1100);
      return () => clearTimeout(t);
    }
    if (state === "done") {
      const t = setTimeout(() => setState("idle"), 1800);
      return () => clearTimeout(t);
    }
  }, [state]);
  return (
    <button
      type="button"
      onClick={() => state === "idle" && setState("running")}
      aria-live="polite"
      className="l-press l-shine relative flex h-8 w-full items-center justify-center gap-1 overflow-hidden rounded-full bg-[var(--l-pink)] text-[12px] leading-4 font-semibold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--l-violet)]"
    >
      {state === "idle" ? (
        <>
          Try demo
          <img src="/landing/icons/play.svg" alt="" width={6} height={7} className="h-[7px] w-[5.5px]" />
        </>
      ) : state === "running" ? (
        <span className="flex items-center gap-2">
          <m.span className="size-3 rounded-full border-2 border-white/40 border-t-white" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }} />
          Running in sandbox…
        </span>
      ) : (
        <m.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          Done, 12 tickets triaged
        </m.span>
      )}
      {state === "running" ? (
        <m.span className="absolute inset-y-0 left-0 bg-white/20" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1.1, ease: "easeInOut" }} />
      ) : null}
    </button>
  );
}

function BuyersCard() {
  return (
    <Card className="gap-[21.75px] self-start">
      <div className="pb-6">
        <div className="l-inset flex flex-col gap-3 p-[17px]">
          <div className="flex items-center gap-3">
            <m.div
              whileHover={{ rotate: -10, scale: 1.1 }}
              className="grid size-10 place-items-center rounded-[12px] bg-[var(--l-brand)] text-[14px] leading-5 font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
            >
              Rx
            </m.div>
            <div>
              <p className="text-[14px] leading-5 font-bold text-[var(--l-ink)]">ResolveDesk Agent</p>
              <p className="text-[11px] leading-[16.5px] text-[var(--l-muted)]">v2.4 • Zendesk &amp; Slack</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-[6px]">
            {["Auto-triage", "SLA monitor"].map((t) => (
              <span key={t} className="rounded-full border border-[var(--l-border)] bg-[var(--l-card)] px-[9px] pt-[2px] pb-[3.5px] text-[11px] leading-[16.5px] font-medium text-[var(--l-ink-2)]">
                {t}
              </span>
            ))}
          </div>
          <DemoButton />
        </div>
      </div>
      {/* changed from design: buyers can't sandbox yet; this is the flow today. */}
      <CardInfo title="For buyers" body="Find an agent, pay with PayPal, then call it from your app or your own AI agent." />
    </Card>
  );
}

/* ---------------- Card 2: for teams ---------------- */

const gateways = [
  { label: "Email read only", icon: "mail", w: 11.667, h: 9.333 },
  { label: "Calendar sync", icon: "calendar-small", w: 10.5, h: 11.667 },
  { label: "Files access", icon: "folder", w: 12.542, h: 9.333 },
];

function TeamsCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [on, setOn] = useState([true, true, true]);
  return (
    <Card className="justify-between self-start">
      <div ref={ref} className="pb-6">
        <div className="l-inset flex flex-col gap-[10px] p-[17px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] leading-4 font-bold text-[var(--l-ink)]">Workspace Gateways</p>
            <LaterStage />
          </div>
          {gateways.map((g, i) => (
            <button
              key={g.label}
              type="button"
              aria-pressed={on[i]}
              onClick={() => setOn((s) => s.map((v, j) => (j === i ? !v : v)))}
              className="l-press flex items-center justify-between rounded-[10px] border border-[var(--l-border)] bg-[var(--l-card)] p-[9px] text-left outline-none hover:border-[rgba(124,92,250,0.35)] focus-visible:ring-2 focus-visible:ring-[var(--l-violet)]"
            >
              <span className="flex items-center gap-[6px]">
                <img src={`/landing/icons/${g.icon}.svg`} alt="" style={{ width: g.w, height: g.h }} />
                <span className="text-[12px] leading-4 font-medium text-[var(--l-ink-2)]">{g.label}</span>
              </span>
              <m.img
                src="/landing/icons/check-circle.svg"
                alt={on[i] ? "Allowed" : "Not allowed"}
                width={12}
                height={12}
                className="size-[11.667px]"
                initial={{ scale: 0 }}
                animate={{ scale: inView && on[i] ? 1 : 0.0001, opacity: on[i] ? 1 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 15, delay: inView ? 0.25 + i * 0.18 : 0 }}
              />
            </button>
          ))}
        </div>
      </div>
      <CardInfo title="For teams and businesses" body="Admin controls, bulk licensing and invoicing." />
    </Card>
  );
}

/* ---------------- Card 3: for builders ---------------- */

const bars = [
  { h: 16, c: "#ddd6fe" },
  { h: 28, c: "#ddd6fe" },
  { h: 36, c: "#c4b5fd" },
  { h: 44, c: "#a78bfa" },
  { h: 48, c: "#7c5cfa" },
];

function CountUp({ to, run }: { to: number; run: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!run || !ref.current) return;
    const node = ref.current;
    const controls = animate(0, to, {
      duration: 1.6,
      ease: EASE,
      onUpdate: (v) => (node.textContent = `$${Math.round(v).toLocaleString("en-US")}`),
    });
    return () => controls.stop();
  }, [run, to]);
  return <span ref={ref}>${to.toLocaleString("en-US")}</span>;
}

function BuildersCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  return (
    <Card className="gap-[21.25px] self-start">
      <div ref={ref} className="pb-6">
        <div className="l-inset flex flex-col justify-between p-[17px]">
          <div className="flex items-center justify-between pb-2">
            <p className="text-[12px] leading-4 text-[var(--l-muted)]">Builder Revenue</p>
            {/* changed from design: sellers keep 90% (10% platform fee), not 85%. */}
            <span className="rounded-full bg-[#d1fae5] px-2 py-[2px] text-[10px] leading-[15px] font-bold text-[#065f46]">90% SPLIT</span>
          </div>
          <p className="pb-2 text-[20px] leading-7 font-extrabold tracking-[-0.5px] text-[var(--l-ink)]">
            <CountUp to={14280} run={inView} />
            <span className="ml-0.5 text-[12px] leading-4 font-normal text-[var(--l-muted)]"> / mo</span>
          </p>
          <div className="flex h-14 items-end gap-2 pt-2">
            {bars.map((b, i) => (
              <m.div
                key={i}
                className="min-w-px flex-1 origin-bottom rounded-t-[2px]"
                style={{ height: b.h, backgroundColor: b.c }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: inView ? 1 : 0 }}
                whileHover={{ scaleY: 1.12 }}
                transition={{ duration: 0.8, ease: EASE, delay: inView ? 0.15 + i * 0.08 : 0 }}
              />
            ))}
          </div>
        </div>
      </div>
      <CardInfo title="For builders" body="List your agent, get reviewed, and earn from every sale." />
    </Card>
  );
}

/* ---------------- Card 4: try before you buy ---------------- */

const command = '> agent.execute({ task: "reconcile_receipts", dry_run: true })';

function Typewriter({ text, run, onDone }: { text: string; run: boolean; onDone: () => void }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (count >= text.length) {
      onDone();
      return;
    }
    const t = setTimeout(() => setCount((c) => c + 1), count === 0 ? 300 : 28);
    return () => clearTimeout(t);
  }, [run, count, text, onDone]);
  const done = count >= text.length;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, count)}
        {!done ? <span className="l-caret">▍</span> : null}
        {/* Reserve the full height so the card never jumps while typing. */}
        <span className="invisible">{text.slice(count)}</span>
      </span>
    </>
  );
}

function SandboxCard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [typed, setTyped] = useState(false);
  const [latency, setLatency] = useState(118);
  useEffect(() => {
    if (!typed) return;
    const t = setInterval(() => setLatency(112 + Math.round(Math.random() * 12)), 1600);
    return () => clearInterval(t);
  }, [typed]);

  return (
    <Card className="gap-8 sm:order-last sm:col-span-2 lg:order-none lg:h-[334.25px] lg:flex-row lg:items-center lg:justify-between">
      <div ref={ref} className="w-full lg:w-[383.33px] lg:shrink-0">
        <div className="l-inset flex flex-col gap-3 p-[21px]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(229,231,235,0.8)] pb-[9px] dark:border-white/10">
            <span className="flex items-center gap-2">
              <span className="l-ping relative size-[10px] rounded-full bg-[var(--l-green)]" />
              <span className="text-[12px] leading-4 font-semibold text-[var(--l-ink)]">Disposable Micro-VM Sandbox</span>
            </span>
            <span className="l-mono rounded-full border border-[var(--l-border)] bg-[var(--l-card)] px-[9px] py-[3px] text-[11px] leading-[16.5px] whitespace-nowrap text-[var(--l-muted)] tabular-nums">
              {latency}ms latency
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-[12px] bg-[var(--l-card)] p-[10px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
            <p className="l-mono min-w-0 text-[12px] leading-4 break-words text-[var(--l-ink)]">
              <Typewriter text={command} run={inView} onDone={() => setTyped(true)} />
            </p>
            <img src="/landing/icons/terminal-small.svg" alt="" width={12} height={10} className="h-[9.333px] w-[11.667px] shrink-0" />
          </div>
          <m.div
            className="rounded-[12px] bg-[var(--l-card)]/70 p-[10px]"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: typed ? 1 : 0, y: typed ? 0 : 6 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <p className="l-mono text-[11px] leading-[16.5px] text-[var(--l-muted)]">
              {'{ "status": "VERIFIED_ISOLATION",'}
              <br />
              {'"taint_checks": 0, "sandbox_id": "vmm-889a" }'}
            </p>
          </m.div>
        </div>
      </div>
      <div className="flex max-w-[280px] flex-col gap-[6px]">
        {/* changed from design: "4.9 / 5 (1,248 reviews)" was a made-up rating; buyer trials aren't built yet. */}
        <div className="pb-2">
          <LaterStage />
        </div>
        <CardInfo title="Try before you buy" body="Every listing offers a free trial or sandbox run so you inspect before authorizing live credentials." />
      </div>
    </Card>
  );
}

/* ---------------- Card 5: verified builders ---------------- */

const orbit = [
  { src: "avatar-1", style: { left: "calc(50% - 14px)", top: -4 } },
  { src: "avatar-2", style: { right: 24, top: 12 } },
  { src: "avatar-3", style: { right: 16, bottom: 12 } },
  { src: "avatar-4", style: { left: 16, bottom: 12 } },
  { src: "avatar-5", style: { left: 24, top: 12 } },
];

function CommunityCard() {
  return (
    <Card className="justify-between self-start">
      <div className="relative h-[168px] pb-6">
        <div className="relative flex h-[144px] items-center justify-center">
          <m.div
            aria-hidden
            className="absolute top-4 left-1/2 size-[112px] -translate-x-1/2 rounded-full border border-dashed border-[#d1d5db] dark:border-white/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          />
          {orbit.map((a, i) => (
            <m.div
              key={a.src}
              aria-hidden
              className="absolute size-7 rounded-full bg-white p-[2px] shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]"
              style={a.style}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              animate={{ x: [0, i % 2 ? 4 : -4, 0], y: [0, i % 2 ? -5 : 5, 0] }}
              transition={{
                opacity: { delay: 0.2 + i * 0.1 },
                scale: { type: "spring", stiffness: 400, damping: 14, delay: 0.2 + i * 0.1 },
                x: { duration: 5 + i, repeat: Infinity, ease: "easeInOut" },
                y: { duration: 4 + i, repeat: Infinity, ease: "easeInOut" },
              }}
              whileHover={{ scale: 1.25 }}
            >
              <span className="relative block size-full overflow-hidden rounded-full">
                <Image src={`/landing/${a.src}.png`} alt="" fill sizes="28px" className="object-cover" />
              </span>
            </m.div>
          ))}
          <m.div
            className="relative grid size-12 place-items-center rounded-full drop-shadow-[0_10px_12px_rgba(124,92,250,0.32)]"
            style={{ backgroundImage: "linear-gradient(45deg, #7c5cfa 0%, #cabeff 100%)" }}
            animate={{ scale: [1, 1.06, 1], boxShadow: ["0 0 0 0 rgba(124,92,250,0.35)", "0 0 0 14px rgba(124,92,250,0)", "0 0 0 0 rgba(124,92,250,0)"] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          >
            <img src="/landing/icons/shield.svg" alt="" width={16} height={20} className="h-5 w-4" />
          </m.div>
        </div>
      </div>
      {/* changed from design: no cryptographic key verification yet; manual review is real. */}
      <CardInfo title="A community of verified builders" body="Every tool passes manual review before public listing, and changes to a live tool are reviewed again." />
    </Card>
  );
}

export function BuiltForEveryone() {
  return (
    <section id="built-for" aria-labelledby="built-for-title" className="mx-auto flex w-full max-w-[1200px] scroll-mt-28 flex-col gap-10 px-6 pt-12 pb-[64px] sm:gap-[56px] sm:py-[80px]">
      <m.div
        className="flex flex-col items-center gap-3 text-center"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <h2 id="built-for-title" className="text-[clamp(36px,7vw,64px)] leading-[1.25] font-bold tracking-[-0.03em] text-[var(--l-ink)]">
          Built for everyone
        </h2>
        <p className="max-w-[600px] text-[16px] leading-6 tracking-[-0.16px] text-[var(--l-muted)]">
          For people who want work done, and people who build the agents that do it.
        </p>
      </m.div>
      <m.div
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        variants={stagger.container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
      >
        <BuyersCard />
        <TeamsCard />
        <BuildersCard />
        <SandboxCard />
        <CommunityCard />
      </m.div>
    </section>
  );
}
