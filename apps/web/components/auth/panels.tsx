import type { ReactNode } from "react";
import type { ToolSummary } from "@/lib/marketplace";
import { AsideChip, AsideHeading } from "./auth-layout";

/*
 * Right-hand panels for the auth screens. They show real tools from the store
 * and facts about how MrStockd works. Where the design showed invented stats
 * (ratings, uptime, team counts), these use what's actually true today.
 */

function Card({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <div
      style={{ animationDelay: `${0.15 + delay * 0.08}s` }}
      className={`l-in-fade rounded-[16px] border border-[rgba(26,25,48,0.07)] bg-white shadow-[0_8px_24px_rgba(13,12,34,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

function Initial({ name }: { name: string }) {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-[12px] border border-[rgba(175,26,93,0.12)] bg-[#fdf1f6] text-[16px] font-bold text-[var(--l-brand)]">
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

function Pill({ children, tone }: { children: ReactNode; tone: "green" | "pink" | "violet" }) {
  const tones = {
    green: "bg-[#ecfdf3] text-[#067647] border-[#abefc6]",
    pink: "bg-[#fdf1f6] text-[var(--l-brand)] border-[rgba(175,26,93,0.15)]",
    violet: "bg-[#f1edff] text-[#5f3bdc] border-[#ddd3ff]",
  } as const;
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-[1px] text-[11px] leading-4 font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

/** Real tools as cards: name, summary, price and builder. */
function ToolCards({ tools, showPrice }: { tools: ToolSummary[]; showPrice: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {tools.map((t, i) => (
        <Card key={t.slug} delay={i} className="p-5">
          <div className="flex items-start gap-4">
            <Initial name={t.name} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-[17px] leading-6 font-semibold text-[var(--l-ink)]">{t.name}</p>
                <Pill tone="green">
                  <span className="size-1.5 rounded-full bg-current" aria-hidden />
                  Reviewed
                </Pill>
              </div>
              <p className="mt-0.5 line-clamp-1 text-[13px] text-[var(--l-muted)]">{t.summary}</p>
            </div>
            {showPrice ? <p className="shrink-0 text-[15px] font-bold whitespace-nowrap text-[var(--l-ink)]">{t.price.replace(/ for /, " · ")}</p> : null}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(26,25,48,0.06)] pt-3 text-[12px] text-[var(--l-muted)]">
            <span>by {t.sellerName}</span>
            <span className="font-semibold text-[var(--l-ink-2)]">{t.pricingModel === "subscription" ? "Monthly plan" : "Pay per call"}</span>
            {showPrice ? null : <span className="font-semibold text-[var(--l-ink)]">{t.price}</span>}
          </div>
        </Card>
      ))}
    </div>
  );
}

const steps = [
  { title: "Find a tool", body: "Search in plain words. Every tool shows its price, docs and builder." },
  { title: "Pay with PayPal", body: "Buy credits or a monthly plan. No card details shared with builders." },
  { title: "Call it anywhere", body: "One API key, from your own app or from your AI agent over MCP." },
];

/** Shown instead of tool cards before any tool is live. */
function StepCards() {
  return (
    <div className="flex flex-col gap-4">
      {steps.map((s, i) => (
        <Card key={s.title} delay={i} className="flex items-start gap-4 p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#fdf1f6] text-[14px] font-bold text-[var(--l-brand)]">0{i + 1}</span>
          <div>
            <p className="text-[16px] font-semibold text-[var(--l-ink)]">{s.title}</p>
            <p className="mt-0.5 text-[13px] text-[var(--l-muted)]">{s.body}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function SignInPanel({ tools, total }: { tools: ToolSummary[]; total: number }) {
  return (
    <>
      <AsideChip>Live marketplace</AsideChip>
      <AsideHeading
        title="AI tools ready to work from day one."
        body="Every tool is reviewed by a person before it's listed. Every call is metered, and the credit comes back if a call fails."
      />
      {tools.length ? <ToolCards tools={tools.slice(0, 3)} showPrice={false} /> : <StepCards />}
      <div className="mt-6 flex items-center justify-between text-[12px] font-semibold text-[var(--l-ink-2)]">
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-[var(--l-green)]" aria-hidden />
          {total > 0 ? `${total} tool${total === 1 ? "" : "s"} in stock` : "First tools in review"}
        </span>
        <span>Paid through PayPal</span>
      </div>
    </>
  );
}

export function SignUpPanel({ tools }: { tools: ToolSummary[] }) {
  return (
    <>
      <AsideChip tone="pink">Reviewed before listing</AsideChip>
      <AsideHeading title="Join the marketplace where every AI tool is checked before it's sold." />
      {tools.length ? <ToolCards tools={tools.slice(0, 3)} showPrice /> : <StepCards />}
      <Card delay={4} className="mt-6 grid grid-cols-3 divide-x divide-[rgba(26,25,48,0.07)] px-2 py-4 text-center text-[12px] font-semibold text-[var(--l-ink)]">
        <span className="px-2">Reviewed by a person</span>
        <span className="px-2">Instant API keys</span>
        <span className="px-2">Refunds on failed calls</span>
      </Card>
    </>
  );
}

/** Facts about how MrStockd protects accounts, keys and tools. */
export function SecurityPanel({ resetMinutes }: { resetMinutes: number }) {
  const rows: [string, string, string][] = [
    ["PASSWORDS", "scrypt hash", "text-[#e5e7eb]"],
    ["API_KEYS", "SHA-256 fingerprint only", "text-[#86efac]"],
    ["SELLER_SECRETS", "AES-256-GCM encrypted", "text-[#f9a8d4]"],
    ["RESET_LINKS", `single use · ${resetMinutes} min`, "text-[#cabeff]"],
  ];
  return (
    <>
      <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(26,25,48,0.08)] bg-white px-3 py-1 text-[12px] leading-4 font-semibold text-[var(--l-ink)] shadow-[0_1px_2px_rgba(13,12,34,0.05)]">
        <ShieldIcon /> How we protect your account
      </span>
      <AsideHeading
        title="Your keys and your tools stay locked down."
        body="Builders' code and secrets never reach buyers, and nothing that could unlock your account is stored in plain text."
      />
      <Card className="p-5">
        <p className="text-[17px] font-semibold text-[var(--l-ink)]">How MrStockd stores secrets</p>
        <div className="mt-4 rounded-[12px] bg-[#0d0c22] p-4">
          <p className="flex items-center gap-2 border-b border-white/10 pb-3 text-[12px] text-white/70">
            <span className="size-2 rounded-full bg-[var(--l-green)]" aria-hidden />
            Storage policy
          </p>
          <dl className="l-mono mt-3 flex flex-col gap-2 text-[11.5px]">
            {rows.map(([k, v, tone]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-white/50">{k}:</dt>
                <dd className={tone}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[12px] border border-[rgba(26,25,48,0.07)] bg-[#faf8fd] p-3">
            <p className="text-[10px] font-bold tracking-[0.5px] text-[var(--l-muted)] uppercase">Failed calls</p>
            <p className="mt-1 text-[20px] font-bold text-[var(--l-ink)]">Refunded</p>
            <p className="text-[12px] text-[var(--l-muted)]">Automatically, every time</p>
          </div>
          <div className="rounded-[12px] border border-[rgba(26,25,48,0.07)] bg-[#faf8fd] p-3">
            <p className="text-[10px] font-bold tracking-[0.5px] text-[var(--l-muted)] uppercase">Sign-in attempts</p>
            <p className="mt-1 text-[20px] font-bold text-[var(--l-ink)]">5 / min</p>
            <p className="text-[12px] text-[var(--l-muted)]">Limit per address</p>
          </div>
        </div>
      </Card>
      <Card delay={2} className="mt-4 flex items-center gap-4 p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#fdf1f6] text-[var(--l-brand)]">
          <KeyIcon />
        </span>
        <div>
          <p className="text-[14px] font-semibold text-[var(--l-ink)]">API keys are shown once</p>
          <p className="text-[12px] text-[var(--l-muted)]">We keep only a fingerprint, so a leaked database can't expose your keys.</p>
        </div>
      </Card>
    </>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#067647" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6L12 3Z" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  );
}
function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8.5-8.5M16.5 6.5l2.5 2.5M14 9l2 2" />
    </svg>
  );
}
