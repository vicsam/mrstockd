import type { Metadata } from "next";
import Script from "next/script";

import { BuilderHero, BuilderJourney, HowListingWorks, PricingModels, BuildingTrust, StorefrontPreview, FoundingBuilderSignup } from "@/components/landing/builder-sections";
import { jakarta } from "@/components/landing/font";
import { REPO_URL } from "@/components/landing/content";
import { LandingFooter } from "@/components/landing/footer";
import { LandingHeader } from "@/components/landing/header";
import { MotionProvider } from "@/components/landing/motion";
import { ScrollProgress } from "@/components/landing/scroll-progress";
import "@/components/landing/landing.css";
import { gatewayPublicUrl, gatewayStatus } from "@/lib/marketplace";

export const revalidate = 60;

const siteUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const description =
  "List your AI agent on MrStockd. Get reviewed before launch and get paid through PayPal. Founding builders pay 5% for their first 12 months.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "For builders | MrStockd",
  description,
  alternates: { canonical: "/builders" },
  openGraph: {
    type: "website",
    url: "/builders",
    siteName: "MrStockd",
    title: "For builders | MrStockd",
    description,
  },
  twitter: { card: "summary_large_image", title: "For builders | MrStockd", description },
};

export default async function BuildersPage() {
  const status = await gatewayStatus();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: "MrStockd", url: siteUrl, logo: `${siteUrl}/landing/logo.png`, sameAs: [REPO_URL] },
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
          <BuilderHero />
          <BuilderJourney />
          <HowListingWorks />
          <PricingModels />
          <BuildingTrust />
          <StorefrontPreview />
          <FoundingBuilderSignup />
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
        <Script id="posthog-builders" strategy="afterInteractive">
          {`!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]);t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.queued_async_requests=t.queued_async_requests||[]).push([i,s,a]);var u;for(e="init capture reset identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing track_pageview has_opted_out_capturing opt_in_capturing opt_out_capturing isFeatureEnabled getFeatureFlag getFeatureFlagPayload getFeatureFlagPayloads onFeatureFlags".split(" "),u=0;u<e.length;u++)g(t,e[u]);e._i.push([i,s,a])})}(window,document);posthog.init('${posthogKey}',{api_host:'https://us.i.posthog.com',capture_pageview:true});`}
        </Script>
      ) : null}
    </div>
  );
}
