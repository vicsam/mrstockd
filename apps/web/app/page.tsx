import type { Metadata } from "next";
import { BuiltForEveryone } from "@/components/landing/bento";
import { ClosingCta } from "@/components/landing/closing-cta";
import { jakarta } from "@/components/landing/font";
import { REPO_URL, faqs } from "@/components/landing/content";
import { LandingFooter } from "@/components/landing/footer";
import { LandingHeader } from "@/components/landing/header";
import { Faq } from "@/components/landing/faq";
import { FeaturedTools } from "@/components/landing/featured-tools";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { MotionProvider } from "@/components/landing/motion";
import { ScrollProgress } from "@/components/landing/scroll-progress";
import { Earnings, Trust } from "@/components/landing/sections";
import "@/components/landing/landing.css";
import { gatewayPublicUrl, gatewayStatus, newestTools } from "@/lib/marketplace";

// Pre-rendered and refreshed at most once a minute, so visitors never wait on a server.
export const revalidate = 60;

const siteUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const gatewayUrl = gatewayPublicUrl;
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

export default async function Home() {
  const [status, featured] = await Promise.all([gatewayStatus(), newestTools(6)]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
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
    <div className={`landing min-h-dvh ${jakarta.variable}`}>
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
          <HowItWorks gatewayUrl={gatewayUrl} />
          <FeaturedTools tools={featured.tools} total={featured.total} />
          <BuiltForEveryone />
          <Trust />
          <Earnings />
          <Faq />
          <ClosingCta />
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
