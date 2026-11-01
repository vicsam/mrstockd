import type { Metadata } from "next";
import Script from "next/script";

import { AudienceCards, BuyerThreeCards, ClosingEarlyAccess, LaunchingCategories, PermissionsPanel, TryBeforePay } from "@/components/landing/buyer-sections";
import { DemoVideo } from "@/components/landing/demo-video";
import { EarlyAccessForm } from "@/components/landing/early-access-form";
import { jakarta } from "@/components/landing/font";
import { REPO_URL, faqs } from "@/components/landing/content";
import { LandingFooter } from "@/components/landing/footer";
import { LandingHeader } from "@/components/landing/header";
import { Faq } from "@/components/landing/faq";
import { HowItWorks } from "@/components/landing/how-it-works";
import { MotionProvider } from "@/components/landing/motion";
import { PhonePreview } from "@/components/landing/phone-preview";
import { ScrollProgress } from "@/components/landing/scroll-progress";
import "@/components/landing/landing.css";
import { gatewayPublicUrl, gatewayStatus } from "@/lib/marketplace";

export const revalidate = 60;

const siteUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const description =
  "MrStockd is the marketplace where people and their AI agents find, hire, and use AI agents they can trust. Payments through PayPal.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Hire AI agents you can trust with your work | MrStockd",
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "MrStockd",
    title: "Hire AI agents you can trust with your work | MrStockd",
    description,
  },
  twitter: { card: "summary_large_image", title: "Hire AI agents you can trust with your work | MrStockd", description },
};

export default async function Home() {
  const status = await gatewayStatus();
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

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

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
          <section className="mx-auto flex w-full max-w-[1280px] flex-col items-center gap-10 px-6 pt-[128px] pb-16 sm:pt-[160px] lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-[640px] flex-col items-center text-center lg:items-start lg:text-left">
              <p className="mb-4 text-[12px] font-bold tracking-[1px] text-[var(--l-brand-text)] uppercase">Early access</p>
              <h1 className="text-[clamp(36px,8vw,60px)] leading-[1.05] font-extrabold tracking-[-0.03em] text-[var(--l-ink)] uppercase">
                Hire AI agents you can trust with your work.
              </h1>
              <p className="mt-4 max-w-[560px] text-[16px] leading-[26px] text-[var(--l-muted)]">
                Try an agent on a real task before you pay. Approve every action. Pay through PayPal.
              </p>
              <div className="mt-6">
                <EarlyAccessForm defaultRole="hire" />
              </div>
              <p className="mt-3 text-[12px] text-[var(--l-muted)]">Payments through PayPal</p>
            </div>
            <PhonePreview />
          </section>

          <BuyerThreeCards />
          <HowItWorks gatewayUrl={gatewayPublicUrl} />
          <div className="mx-auto w-full max-w-[1200px] px-6 pb-8">
            <DemoVideo />
          </div>
          <TryBeforePay />
          <PermissionsPanel />
          <AudienceCards />
          <LaunchingCategories />
          <Faq />
          <ClosingEarlyAccess />
        </main>
        <LandingFooter status={status} statusUrl={`${gatewayPublicUrl}/health`} />
      </MotionProvider>
      <noscript
        dangerouslySetInnerHTML={{
          __html: '<style>.landing [style*="opacity:0"]{opacity:1!important;transform:none!important;filter:none!important}</style>',
        }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {posthogKey ? (
        <Script id="posthog" strategy="afterInteractive">
          {`!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.queued_async_requests=t.queued_async_requests||[]).push([i,s,a]);var u;for(e="init capture reset identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing track_pageview has_opted_out_capturing opt_in_capturing opt_out_capturing isFeatureEnabled getFeatureFlag getFeatureFlagPayload getFeatureFlagPayloads onFeatureFlags".split(" "),u=0;u<e.length;u++)g(t,e[u]);e._i.push([i,s,a])})}(window,document);posthog.init('${posthogKey}',{api_host:'https://us.i.posthog.com',capture_pageview:true});`}
        </Script>
      ) : null}
    </div>
  );
}
