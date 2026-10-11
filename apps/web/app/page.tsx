import type { Metadata } from "next";
import { BuiltForEveryone } from "@/components/landing/bento";
import { REPO_URL } from "@/components/landing/content";
import { LandingFooter } from "@/components/landing/footer";
import { LandingHeader } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Integrations } from "@/components/landing/integrations";
import { MotionProvider } from "@/components/landing/motion";
import { ScrollProgress } from "@/components/landing/scroll-progress";
import { Earnings, Trust } from "@/components/landing/sections";
import { Testers } from "@/components/landing/testers";
import "@/components/landing/landing.css";

// Pre-rendered and refreshed at most once a minute, so visitors never wait on a server.
export const revalidate = 60;

const siteUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const gatewayUrl = (process.env.GATEWAY_PUBLIC_URL ?? "http://localhost:8787").replace(/\/+$/, "");
const description =
  "MrStockd is the marketplace where people and their AI agents find, buy and use AI tools, paid through PayPal. Every builder is verified and every tool is reviewed before it is listed.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "MrStockd: AI tools, in stock",
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "MrStockd",
    title: "MrStockd: AI tools, in stock",
    description,
  },
  twitter: { card: "summary_large_image", title: "MrStockd: AI tools, in stock", description },
};

async function gatewayStatus(): Promise<"ok" | "down" | "unknown"> {
  try {
    const res = await fetch(`${gatewayUrl}/health`, { signal: AbortSignal.timeout(2000), next: { revalidate: 60 } });
    return res.ok ? "ok" : "down";
  } catch {
    return "unknown";
  }
}

export default async function Home() {
  const status = await gatewayStatus();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: "MrStockd", url: siteUrl, logo: `${siteUrl}/landing/logo.png`, sameAs: [REPO_URL] },
      {
        "@type": "WebSite",
        name: "MrStockd",
        url: siteUrl,
        potentialAction: { "@type": "SearchAction", target: `${siteUrl}/tools?q={search_term_string}`, "query-input": "required name=search_term_string" },
      },
    ],
  };

  return (
    <div className="landing min-h-dvh">
      <a
        href="#main"
        className="fixed top-2 left-2 z-[70] -translate-y-20 rounded-full bg-[var(--l-brand)] px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <MotionProvider>
        <ScrollProgress />
        <LandingHeader />
        <main id="main">
          <Hero />
          <BuiltForEveryone />
          <Integrations />
          <Trust />
          <Earnings />
          <Testers />
        </main>
        <LandingFooter status={status} statusUrl={`${gatewayUrl}/health`} />
      </MotionProvider>
      {/* If JavaScript never loads, nothing waits invisible for an animation. */}
      <noscript
        dangerouslySetInnerHTML={{
          __html: '<style>.landing [style*="opacity:0"]{opacity:1!important;transform:none!important;filter:none!important}</style>',
        }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
