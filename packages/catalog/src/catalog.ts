import { assertSafeOutboundUrl, encryptSecret, generateApiKey, slugify, UnsafeUrlError } from "@mrstockd/core";
import { and, type AnyDb, apiKeys, auditLog, desc, eq, gte, inArray, isNull, listings, or, sellers, sql, usageEvents } from "@mrstockd/db";
import { CatalogError } from "./errors.js";
import { type ListingAction, type ListingStatus, nextStatus } from "./lifecycle.js";
import { listingInputSchema, type ListingInput, parseOrThrow, sellerInputSchema, type SellerInput } from "./validation.js";

export interface CatalogDeps {
  db: AnyDb;
  /** Key for encrypting sellers' upstream secrets (same key the gateway decrypts with). */
  encryptionKey: Buffer;
  /** Allow http:// and private-network endpoints. Local development only. */
  allowPrivateEndpoints: boolean;
  now?: () => Date;
}

export interface Seller {
  id: string;
  displayName: string;
  payoutsEnabled: boolean;
}

/** What anyone, including buyers and agents, may see. No endpoint, no secret. */
export interface PublicListing {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  pricingModel: "credits" | "subscription";
  unitPriceCents: number;
  creditsPerUnit: number;
  sellerName: string;
  publishedAt: Date | null;
}

/** What a seller sees about their own listing. The secret itself is never returned. */
export interface SellerListing extends Omit<PublicListing, "sellerName"> {
  status: ListingStatus;
  reviewNote: string | null;
  endpointUrl: string;
  hasSecret: boolean;
  updatedAt: Date;
}

/** Free credits on a seller's test key (credit-pack tools). */
export const TEST_KEY_CREDITS = 50;
/** How long a seller's test key works on a subscription tool. */
export const TEST_KEY_SUBSCRIPTION_HOURS = 24;
/** Test keys a seller can create per tool per day, so free calls can't be farmed. */
export const TEST_KEYS_PER_DAY = 20;

/** Returned once, at creation. The full key is never stored or shown again. */
export interface IssuedTestKey {
  key: string;
  prefix: string;
  creditsRemaining: number;
  validUntil: Date | null;
}

export interface TestKeySummary {
  prefix: string;
  creditsRemaining: number;
  validUntil: Date | null;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface ToolCall {
  at: Date;
  statusCode: number;
  latencyMs: number;
  creditsUsed: number;
  environment: "live" | "test";
}

/** What a seller sees about calls to their own tool. */
export interface ToolActivity {
  testKey: TestKeySummary | null;
  last24h: { calls: number; testCalls: number; failures: number; avgLatencyMs: number | null };
  allTimeCalls: number;
  recent: ToolCall[];
}

export interface SearchResult {
  items: PublicListing[];
  total: number;
}

const publicColumns = {
  id: listings.id,
  slug: listings.slug,
  name: listings.name,
  summary: listings.summary,
  description: listings.description,
  pricingModel: listings.pricingModel,
  unitPriceCents: listings.unitPriceCents,
  creditsPerUnit: listings.creditsPerUnit,
  sellerName: sellers.displayName,
  publishedAt: listings.publishedAt,
};

const sellerColumns = {
  id: listings.id,
  slug: listings.slug,
  name: listings.name,
  summary: listings.summary,
  description: listings.description,
  pricingModel: listings.pricingModel,
  unitPriceCents: listings.unitPriceCents,
  creditsPerUnit: listings.creditsPerUnit,
  publishedAt: listings.publishedAt,
  status: listings.status,
  reviewNote: listings.reviewNote,
  endpointUrl: listings.endpointUrl,
  hasSecret: sql<boolean>`${listings.upstreamSecretEnc} is not null`,
  updatedAt: listings.updatedAt,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Malformed ids are simply "not found", rather than a database error. */
function assertId(id: string): void {
  if (!UUID.test(id)) throw new CatalogError("not_found", "Listing not found.");
}

export function createCatalog(deps: CatalogDeps) {
  const { db } = deps;
  const now = deps.now ?? (() => new Date());

  async function requireSeller(ownerId: string) {
    const [seller] = await db.select().from(sellers).where(eq(sellers.ownerId, ownerId)).limit(1);
    if (!seller) throw new CatalogError("not_a_seller", "Set up your seller profile first.");
    return seller;
  }

  async function checkEndpoint(endpointUrl: string): Promise<string> {
    try {
      const { url } = await assertSafeOutboundUrl(endpointUrl, {
        allowHttp: deps.allowPrivateEndpoints,
        allowPrivate: deps.allowPrivateEndpoints,
      });
      return url.toString();
    } catch (e) {
      const reason = e instanceof UnsafeUrlError ? e.message.replace(/^Unsafe outbound URL: /, "") : "it could not be checked";
      throw new CatalogError("unsafe_endpoint", "That endpoint can't be used.", {
        endpointUrl: `Use a public https:// URL (${reason}).`,
      });
    }
  }

  /** Finds a free slug: "invoice-extractor", then "invoice-extractor-2", … */
  async function uniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || "tool";
    const taken = await db
      .select({ slug: listings.slug })
      .from(listings)
      .where(or(eq(listings.slug, base), sql`${listings.slug} like ${`${base}-%`}`));
    const used = new Set(taken.map((r) => r.slug));
    if (!used.has(base)) return base;
    for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
  }

  async function audit(actorId: string, actorKind: string, action: string, listingId: string, metadata?: Record<string, unknown>) {
    await db.insert(auditLog).values({ actorId, actorKind, action, subjectType: "listing", subjectId: listingId, metadata });
  }

  async function ownedListing(ownerId: string, listingId: string) {
    assertId(listingId);
    const [row] = await db
      .select({ listing: listings })
      .from(listings)
      .innerJoin(sellers, eq(sellers.id, listings.sellerId))
      .where(and(eq(listings.id, listingId), eq(sellers.ownerId, ownerId)))
      .limit(1);
    // Someone else's listing looks exactly like a missing one.
    if (!row) throw new CatalogError("not_found", "Listing not found.");
    return row.listing;
  }

  return {
    /* ---------------------------- Sellers ---------------------------- */

    async getSeller(ownerId: string): Promise<Seller | null> {
      const [seller] = await db
        .select({ id: sellers.id, displayName: sellers.displayName, payoutsEnabled: sellers.payoutsEnabled })
        .from(sellers)
        .where(eq(sellers.ownerId, ownerId))
        .limit(1);
      return seller ?? null;
    },

    async becomeSeller(ownerId: string, input: SellerInput): Promise<Seller> {
      const { displayName } = parseOrThrow(sellerInputSchema, input);
      const [created] = await db
        .insert(sellers)
        .values({ ownerId, displayName })
        .onConflictDoNothing({ target: sellers.ownerId })
        .returning({ id: sellers.id, displayName: sellers.displayName, payoutsEnabled: sellers.payoutsEnabled });
      if (!created) throw new CatalogError("already_a_seller", "You already have a seller profile.");
      return created;
    },

    /* ----------------------- Seller's listings ----------------------- */

    async createListing(ownerId: string, input: ListingInput): Promise<SellerListing> {
      const seller = await requireSeller(ownerId);
      const data = parseOrThrow(listingInputSchema, input);
      const endpointUrl = await checkEndpoint(data.endpointUrl);
      const slug = await uniqueSlug(data.name);
      const secret = data.upstreamSecret?.trim();

      const [created] = await db
        .insert(listings)
        .values({
          sellerId: seller.id,
          slug,
          name: data.name,
          summary: data.summary,
          description: data.description,
          endpointUrl,
          upstreamSecretEnc: secret ? encryptSecret(secret, deps.encryptionKey) : null,
          pricingModel: data.pricingModel,
          unitPriceCents: data.price,
          creditsPerUnit: data.pricingModel === "credits" ? data.creditsPerUnit : 1,
        })
        .returning({ id: listings.id });
      await audit(ownerId, "user", "listing.created", created!.id);
      return this.getMyListing(ownerId, created!.id);
    },

    async listMyListings(ownerId: string): Promise<SellerListing[]> {
      return db
        .select(sellerColumns)
        .from(listings)
        .innerJoin(sellers, eq(sellers.id, listings.sellerId))
        .where(eq(sellers.ownerId, ownerId))
        .orderBy(desc(listings.updatedAt));
    },

    async getMyListing(ownerId: string, listingId: string): Promise<SellerListing> {
      assertId(listingId);
      const [row] = await db
        .select(sellerColumns)
        .from(listings)
        .innerJoin(sellers, eq(sellers.id, listings.sellerId))
        .where(and(eq(listings.id, listingId), eq(sellers.ownerId, ownerId)))
        .limit(1);
      if (!row) throw new CatalogError("not_found", "Listing not found.");
      return row;
    },

    /**
     * Updates a listing. The slug never changes, because buyers' integrations
     * call /v1/tools/<slug>. If a live or paused listing's endpoint or secret
     * changes, it goes back to review: otherwise a seller could swap in a
     * different backend after approval.
     */
    async updateListing(ownerId: string, listingId: string, input: ListingInput): Promise<SellerListing> {
      const current = await ownedListing(ownerId, listingId);
      const data = parseOrThrow(listingInputSchema, input);
      const endpointUrl = await checkEndpoint(data.endpointUrl);
      const secret = data.upstreamSecret?.trim();

      const endpointChanged = endpointUrl !== current.endpointUrl;
      const secretChanged = Boolean(secret);
      const needsReReview = (endpointChanged || secretChanged) && (current.status === "live" || current.status === "paused");

      await db
        .update(listings)
        .set({
          name: data.name,
          summary: data.summary,
          description: data.description,
          endpointUrl,
          ...(secret ? { upstreamSecretEnc: encryptSecret(secret, deps.encryptionKey) } : {}),
          pricingModel: data.pricingModel,
          unitPriceCents: data.price,
          creditsPerUnit: data.pricingModel === "credits" ? data.creditsPerUnit : 1,
          ...(needsReReview ? { status: "in_review" as const, reviewNote: null } : {}),
          updatedAt: now(),
        })
        .where(eq(listings.id, current.id));

      await audit(ownerId, "user", "listing.updated", current.id, {
        endpointChanged,
        secretChanged,
        ...(needsReReview ? { statusFrom: current.status, statusTo: "in_review" } : {}),
      });
      return this.getMyListing(ownerId, listingId);
    },

    /** Seller-side status changes: submit, withdraw, pause, resume. */
    async changeMyListingStatus(ownerId: string, listingId: string, action: Extract<ListingAction, "submit" | "withdraw" | "pause" | "resume">) {
      const current = await ownedListing(ownerId, listingId);
      const to = nextStatus(action, current.status, "seller");
      if (!to) {
        throw new CatalogError("invalid_transition", `A ${current.status.replace("_", " ")} listing can't be ${action === "submit" ? "submitted" : `${action}d`}.`);
      }
      // A paused listing can only resume if it was approved before.
      if (action === "resume" && !current.publishedAt) {
        throw new CatalogError("invalid_transition", "This listing needs review before it can go live.");
      }
      await db
        .update(listings)
        .set({ status: to, ...(action === "submit" ? { reviewNote: null } : {}), updatedAt: now() })
        .where(and(eq(listings.id, current.id), eq(listings.status, current.status)));
      await audit(ownerId, "user", `listing.${action}`, current.id, { from: current.status, to });
      return this.getMyListing(ownerId, listingId);
    },

    /* --------------------- Seller's test key + usage -------------------- */

    /**
     * Gives the seller a free key for their own tool, so they can call it
     * through the gateway before buyers can. Any earlier test key for the
     * tool stops working: there is one active test key per tool.
     */
    async issueTestKey(ownerId: string, listingId: string): Promise<IssuedTestKey> {
      const listing = await ownedListing(ownerId, listingId);
      const at = now();
      const dayAgo = new Date(at.getTime() - 24 * 60 * 60 * 1000);
      const [{ count } = { count: 0 }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(apiKeys)
        .where(and(eq(apiKeys.listingId, listing.id), eq(apiKeys.ownerId, ownerId), eq(apiKeys.environment, "test"), gte(apiKeys.createdAt, dayAgo)));
      if (count >= TEST_KEYS_PER_DAY) {
        throw new CatalogError("limit_reached", "You've made a lot of test keys today. Use your current one, or try again tomorrow.");
      }

      const issued = generateApiKey("test");
      const subscription = listing.pricingModel === "subscription";
      const creditsRemaining = subscription ? 0 : TEST_KEY_CREDITS;
      const validUntil = subscription ? new Date(at.getTime() + TEST_KEY_SUBSCRIPTION_HOURS * 60 * 60 * 1000) : null;

      await db.transaction(async (tx) => {
        await tx
          .update(apiKeys)
          .set({ revokedAt: at, updatedAt: at })
          .where(and(eq(apiKeys.listingId, listing.id), eq(apiKeys.ownerId, ownerId), eq(apiKeys.environment, "test"), isNull(apiKeys.revokedAt)));
        await tx.insert(apiKeys).values({
          ownerId,
          listingId: listing.id,
          environment: "test",
          prefix: issued.prefix,
          keyHash: issued.hash,
          creditsRemaining,
          validUntil,
        });
      });
      await audit(ownerId, "user", "test_key.issued", listing.id, { prefix: issued.prefix });
      return { key: issued.key, prefix: issued.prefix, creditsRemaining, validUntil };
    },

    /** Stops the seller's current test key for this tool, if there is one. */
    async revokeTestKey(ownerId: string, listingId: string): Promise<void> {
      const listing = await ownedListing(ownerId, listingId);
      const at = now();
      const revoked = await db
        .update(apiKeys)
        .set({ revokedAt: at, updatedAt: at })
        .where(and(eq(apiKeys.listingId, listing.id), eq(apiKeys.ownerId, ownerId), eq(apiKeys.environment, "test"), isNull(apiKeys.revokedAt)))
        .returning({ prefix: apiKeys.prefix });
      if (revoked.length) await audit(ownerId, "user", "test_key.revoked", listing.id, { prefix: revoked[0]!.prefix });
    },

    /** Calls to the seller's own tool: their test key, last-day totals, and recent calls. */
    async getToolActivity(ownerId: string, listingId: string): Promise<ToolActivity> {
      const listing = await ownedListing(ownerId, listingId);
      const dayAgo = new Date(now().getTime() - 24 * 60 * 60 * 1000);

      const [testKey] = await db
        .select({
          prefix: apiKeys.prefix,
          creditsRemaining: apiKeys.creditsRemaining,
          validUntil: apiKeys.validUntil,
          createdAt: apiKeys.createdAt,
          lastUsedAt: apiKeys.lastUsedAt,
        })
        .from(apiKeys)
        .where(and(eq(apiKeys.listingId, listing.id), eq(apiKeys.ownerId, ownerId), eq(apiKeys.environment, "test"), isNull(apiKeys.revokedAt)))
        .orderBy(desc(apiKeys.createdAt))
        .limit(1);

      const [day] = await db
        .select({
          calls: sql<number>`count(*)::int`,
          testCalls: sql<number>`count(*) filter (where ${apiKeys.environment} = 'test')::int`,
          failures: sql<number>`count(*) filter (where ${usageEvents.statusCode} >= 500)::int`,
          avgLatencyMs: sql<number | null>`round(avg(${usageEvents.latencyMs}))::int`,
        })
        .from(usageEvents)
        .innerJoin(apiKeys, eq(apiKeys.id, usageEvents.apiKeyId))
        .where(and(eq(usageEvents.listingId, listing.id), gte(usageEvents.createdAt, dayAgo)));

      const [all] = await db
        .select({ calls: sql<number>`count(*)::int` })
        .from(usageEvents)
        .where(eq(usageEvents.listingId, listing.id));

      const recent = await db
        .select({
          at: usageEvents.createdAt,
          statusCode: usageEvents.statusCode,
          latencyMs: usageEvents.latencyMs,
          creditsUsed: usageEvents.creditsUsed,
          environment: apiKeys.environment,
        })
        .from(usageEvents)
        .innerJoin(apiKeys, eq(apiKeys.id, usageEvents.apiKeyId))
        .where(eq(usageEvents.listingId, listing.id))
        .orderBy(desc(usageEvents.createdAt))
        .limit(10);

      return {
        testKey: testKey ?? null,
        last24h: {
          calls: day?.calls ?? 0,
          testCalls: day?.testCalls ?? 0,
          failures: day?.failures ?? 0,
          avgLatencyMs: day?.avgLatencyMs ?? null,
        },
        allTimeCalls: all?.calls ?? 0,
        recent,
      };
    },

    /* ---------------------------- Review ----------------------------- */

    /** Listings waiting for review, oldest first. Callers must check reviewer rights. */
    async listForReview(): Promise<(SellerListing & { sellerName: string })[]> {
      return db
        .select({ ...sellerColumns, sellerName: sellers.displayName })
        .from(listings)
        .innerJoin(sellers, eq(sellers.id, listings.sellerId))
        .where(eq(listings.status, "in_review"))
        .orderBy(listings.updatedAt);
    },

    /** Approve or reject. Callers must check the reviewer's rights first. */
    async review(reviewerId: string, listingId: string, decision: "approve" | "reject", note?: string): Promise<{ name: string; slug: string }> {
      assertId(listingId);
      const [current] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
      if (!current) throw new CatalogError("not_found", "Listing not found.");
      const to = nextStatus(decision, current.status, "reviewer");
      if (!to) throw new CatalogError("invalid_transition", "Only listings in review can be approved or rejected.");
      const trimmedNote = note?.trim();
      if (decision === "reject" && !trimmedNote) {
        throw new CatalogError("validation", "Tell the seller why.", { note: "Add a reason so the seller can fix it." });
      }
      // Re-check the endpoint at approval time: DNS may have changed since it was saved.
      await checkEndpoint(current.endpointUrl);
      const at = now();
      await db
        .update(listings)
        .set({
          status: to,
          reviewNote: decision === "reject" ? trimmedNote : null,
          ...(decision === "approve" && !current.publishedAt ? { publishedAt: at } : {}),
          updatedAt: at,
        })
        .where(and(eq(listings.id, listingId), eq(listings.status, "in_review")));
      await audit(reviewerId, "reviewer", `listing.${decision}`, listingId, trimmedNote ? { note: trimmedNote } : undefined);
      return { name: current.name, slug: current.slug };
    },

    /* ---------------------------- Public ----------------------------- */

    async getPublicListing(slug: string): Promise<PublicListing | null> {
      const [row] = await db
        .select(publicColumns)
        .from(listings)
        .innerJoin(sellers, eq(sellers.id, listings.sellerId))
        .where(and(eq(listings.slug, slug), eq(listings.status, "live")))
        .limit(1);
      return row ?? null;
    },

    /**
     * Keyword search over live listings, best match first. An empty query
     * returns the newest tools. Uses Postgres full-text search with
     * stemming, so "invoices" also finds "invoice".
     */
    async search(params: { query?: string; pricingModel?: "credits" | "subscription"; limit?: number; offset?: number } = {}): Promise<SearchResult> {
      const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);
      const offset = Math.max(params.offset ?? 0, 0);
      const query = params.query?.trim().slice(0, 200) ?? "";

      const filters = [eq(listings.status, "live")];
      if (params.pricingModel) filters.push(eq(listings.pricingModel, params.pricingModel));

      if (!query) {
        const where = and(...filters);
        const [items, [count]] = await Promise.all([
          db.select(publicColumns).from(listings).innerJoin(sellers, eq(sellers.id, listings.sellerId)).where(where).orderBy(desc(listings.publishedAt)).limit(limit).offset(offset),
          db.select({ n: sql<number>`count(*)::int` }).from(listings).where(where),
        ]);
        return { items, total: count?.n ?? 0 };
      }

      // Visitors type tasks in plain words ("extract invoice data"), so match
      // tools that share ANY of the words and let the rank put the closest
      // matches first. websearch_to_tsquery joins words with AND; turning
      // those ANDs into ORs keeps its stemming and phrases; an AND in front of a
      // "-word" exclusion is left alone so exclusions still exclude.
      const tsQuery = sql`regexp_replace(websearch_to_tsquery('english', ${query})::text, ' & (?!!)', ' | ', 'g')::tsquery`;
      // Full-text match, plus a plain substring match on the name so partial
      // words ("invo") still find something.
      const matches = or(sql`${listings.searchVector} @@ ${tsQuery}`, sql`${listings.name} ilike ${`%${query.replace(/[%_\\]/g, "\\$&")}%`}`);
      const where = and(...filters, matches);
      const rank = sql<number>`ts_rank(${listings.searchVector}, ${tsQuery})`;

      const [items, [count]] = await Promise.all([
        db.select(publicColumns).from(listings).innerJoin(sellers, eq(sellers.id, listings.sellerId)).where(where).orderBy(desc(rank), desc(listings.publishedAt)).limit(limit).offset(offset),
        db.select({ n: sql<number>`count(*)::int` }).from(listings).where(where),
      ]);
      return { items, total: count?.n ?? 0 };
    },

    /** Several live listings by id, e.g. for an agent comparing options. */
    async getPublicListingsByIds(ids: string[]): Promise<PublicListing[]> {
      ids = ids.filter((id) => UUID.test(id));
      if (ids.length === 0) return [];
      return db
        .select(publicColumns)
        .from(listings)
        .innerJoin(sellers, eq(sellers.id, listings.sellerId))
        .where(and(inArray(listings.id, ids.slice(0, 50)), eq(listings.status, "live")));
    },
  };
}

export type Catalog = ReturnType<typeof createCatalog>;
