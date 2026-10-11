import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/sell", "/account", "/api"] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
