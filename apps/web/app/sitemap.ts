import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return [
    { url: `${site}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${site}/tools`, changeFrequency: "daily", priority: 0.8 },
    { url: `${site}/sign-up`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
