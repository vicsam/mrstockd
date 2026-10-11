import { INTEREST_TOPICS, MIN_INTERESTS } from "@mrstockd/catalog";
import type { Metadata } from "next";
import Image from "next/image";
import { jakarta } from "@/components/landing/font";
import { REPO_URL } from "@/components/landing/content";
import "@/components/landing/landing.css";
import { requireSession } from "@/lib/auth";
import { getInterests } from "@/lib/catalog";
import { TopicPicker } from "./topic-picker";

export const metadata: Metadata = { title: "What do you want to automate? · MrStockd", robots: { index: false } };

const help = process.env.NEXT_PUBLIC_CONTACT_EMAIL ? `mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}` : "/#faq";

export default async function WelcomePage() {
  const session = await requireSession();
  const saved = await getInterests().get(session.user.id);

  return (
    <div className={`landing flex min-h-dvh flex-col ${jakarta.variable}`} style={{ ["--l-canvas" as string]: "#faf8fd" }}>
      <header className="flex items-center justify-between gap-4 border-b border-[rgba(26,25,48,0.06)] bg-white px-6 py-5 sm:px-7">
        <a href="/" aria-label="MrStockd home" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--l-violet)]">
          <Image src="/landing/logo.png" alt="MrStockd" width={106} height={32} priority className="h-8 w-auto" />
        </a>
        <span className="hidden items-center gap-2 rounded-full border border-[rgba(26,25,48,0.08)] bg-[#f6f4fb] px-3 py-1 text-[12px] font-semibold text-[var(--l-ink-2)] sm:inline-flex">
          <span className="size-1.5 rounded-full bg-[var(--l-brand)]" aria-hidden />
          Step 1 of 1: Personalize your feed
        </span>
        <a href={help} className="text-[14px] font-semibold text-[var(--l-ink-2)] outline-none hover:text-[var(--l-ink)] focus-visible:underline">
          Need help?
        </a>
      </header>

      <main id="main" className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:py-12">
        <span aria-hidden className="pointer-events-none absolute -right-40 -bottom-40 size-[520px] rounded-full bg-[#fbe3ee] opacity-70 blur-[120px]" />
        <span aria-hidden className="pointer-events-none absolute -top-40 -left-40 size-[420px] rounded-full bg-[#ece6ff] opacity-60 blur-[120px]" />
        <div className="l-in-fade relative w-full max-w-[575px] rounded-[16px] border border-[rgba(26,25,48,0.06)] bg-white px-5 py-10 text-center shadow-[0_24px_48px_-24px_rgba(13,12,34,0.25)] sm:px-10">
          <span className="mx-auto grid size-14 place-items-center rounded-[14px] border border-[rgba(175,26,93,0.12)] bg-[#fdf1f6] text-[var(--l-brand)]">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="4" y="8" width="16" height="11" rx="3" />
              <path d="M12 8V5M10 4h4M9 13h.01M15 13h.01M10 16h4M2 12v3M22 12v3" />
            </svg>
          </span>
          <h1 className="mt-6 text-[clamp(26px,5vw,32px)] leading-[1.15] font-bold tracking-[-0.03em] text-[var(--l-ink)]">What do you want to automate?</h1>
          <p className="mx-auto mt-3 max-w-[400px] text-[14px] leading-[21px] text-[var(--l-muted)]">
            Pick at least {MIN_INTERESTS} topics and we&apos;ll show you tools that fit. You can change these any time.
          </p>
          <TopicPicker topics={INTEREST_TOPICS.map((t) => ({ id: t.id, label: t.label }))} initial={saved} min={MIN_INTERESTS} />
        </div>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(26,25,48,0.06)] bg-white px-6 py-5 text-[12px] text-[var(--l-muted)] sm:px-6">
        <span>© {new Date().getFullYear()} MrStockd</span>
        <nav aria-label="Footer" className="flex gap-6">
          <a href="/#faq" className="hover:text-[var(--l-ink)]">
            FAQ
          </a>
          <a href={`${REPO_URL}#security-principles`} className="hover:text-[var(--l-ink)]">
            Security
          </a>
        </nav>
      </footer>
    </div>
  );
}
