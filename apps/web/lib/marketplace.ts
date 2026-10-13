import { getCatalog } from "./catalog";
import { describePricing } from "./format";

/** The few listing fields public pages show about a tool. */
export type ToolSummary = { slug: string; name: string; summary: string; price: string; pricingModel: "credits" | "subscription"; sellerName: string };

export const gatewayPublicUrl = (process.env.GATEWAY_PUBLIC_URL ?? "http://localhost:8787").replace(/\/+$/, "");

/**
 * True while `next build` pre-renders pages. The database and gateway aren't
 * needed then: pages fill in live data on their first refresh after deploy.
 */
const building = process.env.NEXT_PHASE === "phase-production-build";

/** Whether the gateway answers its health check (cached for a minute). */
export async function gatewayStatus(): Promise<"ok" | "down" | "unknown"> {
  if (building) return "unknown";
  try {
    const res = await fetch(`${gatewayPublicUrl}/health`, { signal: AbortSignal.timeout(2000), next: { revalidate: 60 } });
    return res.ok ? "ok" : "down";
  } catch {
    return "unknown";
  }
}

/** The newest live tools. Pages still render if the database can't be reached. */
export async function newestTools(limit: number): Promise<{ tools: ToolSummary[]; total: number }> {
  if (building) return { tools: [], total: 0 };
  try {
    const { items, total } = await getCatalog().search({ limit });
    return {
      total,
      tools: items.map((t) => ({ slug: t.slug, name: t.name, summary: t.summary, price: describePricing(t), pricingModel: t.pricingModel, sellerName: t.sellerName })),
    };
  } catch (e) {
    console.error("could not load tools", e);
    return { tools: [], total: 0 };
  }
}
