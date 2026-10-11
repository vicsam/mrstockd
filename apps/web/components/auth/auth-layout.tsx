import Image from "next/image";
import type { ReactNode } from "react";
import { jakarta } from "@/components/landing/font";
import "@/components/landing/landing.css";

/**
 * Split-screen layout for sign in, sign up and password reset: the form on the
 * left, a panel about the marketplace on the right (wide screens only).
 * Reuses the landing page's colours and font so the two feel like one product.
 */
export function AuthLayout({ topRight, children, footer, aside }: { topRight?: ReactNode; children: ReactNode; footer?: ReactNode; aside: ReactNode }) {
  return (
    <div className={`landing auth-page min-h-dvh ${jakarta.variable}`} style={{ ["--l-canvas" as string]: "#faf8fd" }}>
      <div className="grid min-h-dvh lg:grid-cols-2">
        <div className="flex min-h-dvh flex-col bg-[#faf8fd] px-6 py-8 sm:px-12 lg:px-20 lg:py-[86px]">
          <header className="flex items-center justify-between gap-4">
            <a href="/" aria-label="MrStockd home" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--l-violet)]">
              <Image src="/landing/logo.png" alt="MrStockd" width={106} height={32} priority className="h-8 w-auto" />
            </a>
            {topRight}
          </header>
          <main id="main" className="mx-auto flex w-full max-w-[448px] flex-1 flex-col justify-center py-12 lg:mx-0 lg:ml-4">
            {children}
          </main>
          {footer ? <footer className="border-t border-[rgba(26,25,48,0.08)] pt-6 text-[12px] leading-5 text-[var(--l-muted)]">{footer}</footer> : null}
        </div>
        <aside className="relative hidden overflow-hidden bg-[#f4f1fb] lg:flex lg:flex-col lg:justify-center lg:px-16 xl:px-[64px]">
          <span aria-hidden className="pointer-events-none absolute -top-40 -right-32 size-[520px] rounded-full bg-[#f9d6e6] opacity-70 blur-[110px]" />
          <span aria-hidden className="pointer-events-none absolute -bottom-48 -left-24 size-[420px] rounded-full bg-[#e8e0ff] opacity-70 blur-[110px]" />
          <div className="relative mx-auto w-full max-w-[520px]">{aside}</div>
        </aside>
      </div>
    </div>
  );
}

/** The small pill above each right-panel headline. */
export function AsideChip({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "pink" }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(26,25,48,0.08)] bg-white px-3 py-1 text-[11px] leading-4 font-bold tracking-[0.4px] text-[var(--l-ink)] uppercase shadow-[0_1px_2px_rgba(13,12,34,0.05)]">
      <span className={`size-1.5 rounded-full ${tone === "green" ? "bg-[var(--l-green)]" : "bg-[var(--l-brand)]"}`} aria-hidden />
      {children}
    </span>
  );
}

export function AsideHeading({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col gap-3 pt-4 pb-8">
      <h2 className="text-[clamp(26px,2.6vw,32px)] leading-[1.15] font-bold tracking-[-0.03em] text-[var(--l-ink)]">{title}</h2>
      {body ? <p className="text-[14px] leading-[22px] text-[var(--l-muted)]">{body}</p> : null}
    </div>
  );
}

/** Footer used on every auth screen. */
export function AuthFooter({ status }: { status?: "ok" | "down" | "unknown" }) {
  const year = new Date().getFullYear();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      {status ? (
        <span className="inline-flex items-center gap-2 font-semibold text-[var(--l-ink-2)]">
          <span className={`size-2 rounded-full ${status === "ok" ? "bg-[var(--l-green)]" : status === "down" ? "bg-[#f25c54]" : "bg-[#9ca3af]"}`} aria-hidden />
          {status === "ok" ? "Marketplace API operational" : status === "down" ? "Marketplace API having trouble" : "Marketplace API status unknown"}
        </span>
      ) : null}
      <span>© {year} MrStockd</span>
    </div>
  );
}
