import { and, type AnyDb, apiKeys, eq, gte, isNull, listings, sql, usageEvents } from "@mrstockd/db";
import type { GatewayStore } from "./store.js";

/** Postgres-backed store. Works with any Drizzle Postgres driver. */
export function createDbStore(db: AnyDb): GatewayStore {
  return {
    async findKeyByPrefix(prefix) {
      const [row] = await db
        .select({
          id: apiKeys.id,
          ownerId: apiKeys.ownerId,
          listingId: apiKeys.listingId,
          environment: apiKeys.environment,
          keyHash: apiKeys.keyHash,
          creditsRemaining: apiKeys.creditsRemaining,
          validUntil: apiKeys.validUntil,
          revokedAt: apiKeys.revokedAt,
        })
        .from(apiKeys)
        .where(eq(apiKeys.prefix, prefix))
        .limit(1);
      return row ?? null;
    },

    async findListingBySlug(slug) {
      const [row] = await db
        .select({
          id: listings.id,
          slug: listings.slug,
          status: listings.status,
          pricingModel: listings.pricingModel,
          endpointUrl: listings.endpointUrl,
          upstreamSecretEnc: listings.upstreamSecretEnc,
        })
        .from(listings)
        .where(eq(listings.slug, slug))
        .limit(1);
      return row ?? null;
    },

    async findListingById(id) {
      const [row] = await db
        .select({
          id: listings.id,
          slug: listings.slug,
          name: listings.name,
          status: listings.status,
          pricingModel: listings.pricingModel,
          endpointUrl: listings.endpointUrl,
          upstreamSecretEnc: listings.upstreamSecretEnc,
        })
        .from(listings)
        .where(eq(listings.id, id))
        .limit(1);
      return row ?? null;
    },

    async consumeCredits(keyId, amount) {
      // Single conditional UPDATE: two concurrent calls can never spend the same credit.
      const [row] = await db
        .update(apiKeys)
        .set({
          creditsRemaining: sql`${apiKeys.creditsRemaining} - ${amount}`,
          lastUsedAt: new Date(),
        })
        .where(and(eq(apiKeys.id, keyId), gte(apiKeys.creditsRemaining, amount), isNull(apiKeys.revokedAt)))
        .returning({ remaining: apiKeys.creditsRemaining });
      return row ? row.remaining : null;
    },

    async refundCredits(keyId, amount) {
      await db
        .update(apiKeys)
        .set({ creditsRemaining: sql`${apiKeys.creditsRemaining} + ${amount}` })
        .where(eq(apiKeys.id, keyId));
    },

    async touchKey(keyId) {
      await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, keyId));
    },

    async recordUsage(usage) {
      await db.insert(usageEvents).values(usage);
    },
  };
}
