import { getCatalog } from "@/lib/catalog";
import { describePricing } from "@/lib/format";

/**
 * Public, read-only search used by the landing page's live search box.
 * Returns at most 4 live tools with only the fields a visitor sees on a
 * tool card. Never returns endpoints, secrets or anything about sellers
 * beyond their display name.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;
const hits = new Map<string, { count: number; resetAt: number }>();

/** Small per-IP limit so the endpoint can't be used to hammer the database. */
function allowed(ip: string, now: number): boolean {
  const entry = hits.get(ip);
  if (!entry || entry.resetAt <= now) {
    if (hits.size > 10_000) hits.clear();
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_PER_WINDOW;
}

function clientIp(request: Request): string {
  // Behind Render's proxy the rightmost X-Forwarded-For entry is the one the proxy added.
  const forwarded = request.headers.get("x-forwarded-for");
  if (process.env.TRUST_PROXY === "true" && forwarded) return forwarded.split(",").at(-1)!.trim();
  return request.headers.get("x-real-ip") ?? "local";
}

export async function GET(request: Request) {
  if (!allowed(clientIp(request), Date.now())) {
    return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "60" } });
  }
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return Response.json({ items: [], total: 0 });

  try {
    const { items, total } = await getCatalog().search({ query: q, limit: 4 });
    return Response.json(
      {
        total,
        items: items.map((t) => ({ slug: t.slug, name: t.name, summary: t.summary, price: describePricing(t), sellerName: t.sellerName })),
      },
      { headers: { "Cache-Control": "public, max-age=30" } },
    );
  } catch (e) {
    console.error("catalog search failed", e);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
