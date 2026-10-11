import { and, type AnyDb, apiKeys, eq, inArray, isNull, listings, orders, sellers, sql, usageEvents } from "@mrstockd/db";
import type { ListingStatus } from "./lifecycle.js";

/**
 * Numbers for the seller and admin dashboards. Sellers only ever get rows
 * for their own tools; the admin view is unscoped, so callers must check
 * reviewer rights first.
 */

export interface ToolStats {
  id: string;
  slug: string;
  name: string;
  sellerName: string;
  status: ListingStatus;
  pricingModel: "credits" | "subscription";
  unitPriceCents: number;
  calls24h: number;
  calls7d: number;
  testCalls7d: number;
  failures7d: number;
  /** Share of last-7-day calls that failed on the seller's side (5xx), 0–1. Null with no calls. */
  failureRate7d: number | null;
  avgLatencyMs7d: number | null;
  p95LatencyMs7d: number | null;
  callsAllTime: number;
  lastCallAt: Date | null;
  /** Paid keys that still work. */
  activeKeys: number;
  buyers: number;
  /** Completed sales: what the seller receives, after the platform fee. */
  sellerRevenueCents: number;
  grossSalesCents: number;
  updatedAt: Date;
}

export interface DailyCalls {
  /** UTC day, YYYY-MM-DD */
  day: string;
  calls: number;
  failures: number;
}

export interface CallRow {
  at: Date;
  toolName: string;
  toolSlug: string;
  statusCode: number;
  latencyMs: number;
  creditsUsed: number;
  environment: "live" | "test";
}

export interface DashboardTotals {
  tools: number;
  liveTools: number;
  inReview: number;
  calls24h: number;
  calls7d: number;
  failureRate7d: number | null;
  avgLatencyMs7d: number | null;
  buyers: number;
  sellerRevenueCents: number;
  grossSalesCents: number;
  platformFeesCents: number;
}

export interface Dashboard {
  totals: DashboardTotals;
  tools: ToolStats[];
  daily: DailyCalls[];
  recentCalls: CallRow[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A timestamp parameter for raw SQL. Drivers differ on Date objects inside
 * sql`` templates (postgres-js rejects them), so send ISO text with a cast.
 */
const ts = (d: Date) => sql`${d.toISOString()}::timestamptz`;

export function createAnalytics(deps: { db: AnyDb; now?: () => Date }) {
  const { db } = deps;
  const now = deps.now ?? (() => new Date());

  async function build(ownerId: string | null, options: { days?: number; recentLimit?: number } = {}): Promise<Dashboard> {
    const days = Math.min(Math.max(options.days ?? 14, 1), 90);
    const recentLimit = Math.min(Math.max(options.recentLimit ?? 200, 1), 1000);
    const at = now();
    const dayAgo = new Date(at.getTime() - DAY_MS);
    const weekAgo = new Date(at.getTime() - 7 * DAY_MS);

    const toolRows = await db
      .select({
        id: listings.id,
        slug: listings.slug,
        name: listings.name,
        sellerName: sellers.displayName,
        status: listings.status,
        pricingModel: listings.pricingModel,
        unitPriceCents: listings.unitPriceCents,
        updatedAt: listings.updatedAt,
      })
      .from(listings)
      .innerJoin(sellers, eq(sellers.id, listings.sellerId))
      .where(ownerId ? eq(sellers.ownerId, ownerId) : undefined)
      .orderBy(listings.name);

    const ids = toolRows.map((t) => t.id);
    const emptyTotals: DashboardTotals = {
      tools: 0,
      liveTools: 0,
      inReview: 0,
      calls24h: 0,
      calls7d: 0,
      failureRate7d: null,
      avgLatencyMs7d: null,
      buyers: 0,
      sellerRevenueCents: 0,
      grossSalesCents: 0,
      platformFeesCents: 0,
    };
    if (ids.length === 0) {
      return { totals: emptyTotals, tools: [], daily: fillDays([], days, at), recentCalls: [] };
    }

    const inWeek = sql`${usageEvents.createdAt} >= ${ts(weekAgo)}`;
    const [usage, keys, sales, daily, recent, weekTotals, buyerTotal] = await Promise.all([
      db
        .select({
          listingId: usageEvents.listingId,
          calls24h: sql<number>`count(*) filter (where ${usageEvents.createdAt} >= ${ts(dayAgo)})::int`,
          calls7d: sql<number>`count(*) filter (where ${inWeek})::int`,
          testCalls7d: sql<number>`count(*) filter (where ${inWeek} and ${apiKeys.environment} = 'test')::int`,
          failures7d: sql<number>`count(*) filter (where ${inWeek} and ${usageEvents.statusCode} >= 500)::int`,
          avgLatencyMs7d: sql<number | null>`round(avg(${usageEvents.latencyMs}) filter (where ${inWeek}))::int`,
          p95LatencyMs7d: sql<number | null>`round(percentile_cont(0.95) within group (order by ${usageEvents.latencyMs}) filter (where ${inWeek}))::int`,
          callsAllTime: sql<number>`count(*)::int`,
          lastCallAt: sql<Date | null>`max(${usageEvents.createdAt})`,
        })
        .from(usageEvents)
        .innerJoin(apiKeys, eq(apiKeys.id, usageEvents.apiKeyId))
        .where(inArray(usageEvents.listingId, ids))
        .groupBy(usageEvents.listingId),
      db
        .select({
          listingId: apiKeys.listingId,
          activeKeys: sql<number>`count(*)::int`,
          buyers: sql<number>`count(distinct ${apiKeys.ownerId})::int`,
        })
        .from(apiKeys)
        .where(and(inArray(apiKeys.listingId, ids), eq(apiKeys.environment, "live"), isNull(apiKeys.revokedAt)))
        .groupBy(apiKeys.listingId),
      db
        .select({
          listingId: orders.listingId,
          sellerRevenueCents: sql<number>`coalesce(sum(${orders.sellerPayoutCents}), 0)::int`,
          grossSalesCents: sql<number>`coalesce(sum(${orders.subtotalCents}), 0)::int`,
          platformFeesCents: sql<number>`coalesce(sum(${orders.platformFeeCents}), 0)::int`,
        })
        .from(orders)
        .where(and(inArray(orders.listingId, ids), eq(orders.status, "completed")))
        .groupBy(orders.listingId),
      db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${usageEvents.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
          calls: sql<number>`count(*)::int`,
          failures: sql<number>`count(*) filter (where ${usageEvents.statusCode} >= 500)::int`,
        })
        .from(usageEvents)
        .where(and(inArray(usageEvents.listingId, ids), sql`${usageEvents.createdAt} >= ${ts(new Date(at.getTime() - days * DAY_MS))}`))
        .groupBy(sql`1`),
      db
        .select({
          at: usageEvents.createdAt,
          toolName: listings.name,
          toolSlug: listings.slug,
          statusCode: usageEvents.statusCode,
          latencyMs: usageEvents.latencyMs,
          creditsUsed: usageEvents.creditsUsed,
          environment: apiKeys.environment,
        })
        .from(usageEvents)
        .innerJoin(listings, eq(listings.id, usageEvents.listingId))
        .innerJoin(apiKeys, eq(apiKeys.id, usageEvents.apiKeyId))
        .where(inArray(usageEvents.listingId, ids))
        .orderBy(sql`${usageEvents.createdAt} desc`)
        .limit(recentLimit),
      db
        .select({ avgLatencyMs7d: sql<number | null>`round(avg(${usageEvents.latencyMs}))::int` })
        .from(usageEvents)
        .where(and(inArray(usageEvents.listingId, ids), inWeek)),
      // Distinct across tools: one person who bought two tools is one buyer.
      db
        .select({ buyers: sql<number>`count(distinct ${apiKeys.ownerId})::int` })
        .from(apiKeys)
        .where(and(inArray(apiKeys.listingId, ids), eq(apiKeys.environment, "live"), isNull(apiKeys.revokedAt))),
    ]);

    const byId = <T extends { listingId: string }>(rows: T[]) => new Map(rows.map((r) => [r.listingId, r]));
    const usageBy = byId(usage);
    const keysBy = byId(keys);
    const salesBy = byId(sales);

    const tools: ToolStats[] = toolRows.map((t) => {
      const u = usageBy.get(t.id);
      const k = keysBy.get(t.id);
      const s = salesBy.get(t.id);
      const calls7d = u?.calls7d ?? 0;
      const failures7d = u?.failures7d ?? 0;
      return {
        ...t,
        calls24h: u?.calls24h ?? 0,
        calls7d,
        testCalls7d: u?.testCalls7d ?? 0,
        failures7d,
        failureRate7d: calls7d ? failures7d / calls7d : null,
        avgLatencyMs7d: u?.avgLatencyMs7d ?? null,
        p95LatencyMs7d: u?.p95LatencyMs7d ?? null,
        callsAllTime: u?.callsAllTime ?? 0,
        lastCallAt: u?.lastCallAt ? new Date(u.lastCallAt) : null,
        activeKeys: k?.activeKeys ?? 0,
        buyers: k?.buyers ?? 0,
        sellerRevenueCents: s?.sellerRevenueCents ?? 0,
        grossSalesCents: s?.grossSalesCents ?? 0,
      };
    });

    const sum = (pick: (t: ToolStats) => number) => tools.reduce((n, t) => n + pick(t), 0);
    const calls7d = sum((t) => t.calls7d);
    const totals: DashboardTotals = {
      tools: tools.length,
      liveTools: tools.filter((t) => t.status === "live").length,
      inReview: tools.filter((t) => t.status === "in_review").length,
      calls24h: sum((t) => t.calls24h),
      calls7d,
      failureRate7d: calls7d ? sum((t) => t.failures7d) / calls7d : null,
      avgLatencyMs7d: weekTotals[0]?.avgLatencyMs7d ?? null,
      buyers: buyerTotal[0]?.buyers ?? 0,
      sellerRevenueCents: sum((t) => t.sellerRevenueCents),
      grossSalesCents: sum((t) => t.grossSalesCents),
      platformFeesCents: sales.reduce((n, s) => n + s.platformFeesCents, 0),
    };

    return {
      totals,
      tools,
      daily: fillDays(daily, days, at),
      recentCalls: recent.map((r) => ({ ...r, at: new Date(r.at) })),
    };
  }

  return {
    /** One seller's tools. */
    sellerDashboard: (ownerId: string, options?: { days?: number; recentLimit?: number }) => build(ownerId, options),
    /** Every tool on MrStockd. Callers must check reviewer rights. */
    adminDashboard: (options?: { days?: number; recentLimit?: number }) => build(null, options),
  };
}

/** One entry per day, oldest first, including days with no calls. */
function fillDays(rows: DailyCalls[], days: number, at: Date): DailyCalls[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: DailyCalls[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(at.getTime() - i * DAY_MS).toISOString().slice(0, 10);
    out.push(byDay.get(day) ?? { day, calls: 0, failures: 0 });
  }
  return out;
}

export type Analytics = ReturnType<typeof createAnalytics>;
