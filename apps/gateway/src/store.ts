/**
 * Everything the gateway needs from storage, behind one interface so the
 * request pipeline can be tested and the backing store swapped (e.g. a
 * Redis-fronted store for hot keys) without touching the pipeline.
 */

export interface KeyRecord {
  id: string;
  ownerId: string;
  listingId: string;
  keyHash: string;
  creditsRemaining: number;
  validUntil: Date | null;
  revokedAt: Date | null;
}

export interface ListingRecord {
  id: string;
  slug: string;
  status: "draft" | "in_review" | "live" | "rejected" | "paused";
  pricingModel: "credits" | "subscription";
  endpointUrl: string;
  upstreamSecretEnc: string | null;
}

export interface UsageRecord {
  apiKeyId: string;
  listingId: string;
  creditsUsed: number;
  statusCode: number;
  latencyMs: number;
}

export interface GatewayStore {
  findKeyByPrefix(prefix: string): Promise<KeyRecord | null>;
  findListingBySlug(slug: string): Promise<ListingRecord | null>;
  /**
   * Atomically takes `amount` credits if the key has enough and is not revoked.
   * Returns the credits left, or null if there were not enough.
   */
  consumeCredits(keyId: string, amount: number): Promise<number | null>;
  /** Gives credits back after a call that failed on the seller's side. */
  refundCredits(keyId: string, amount: number): Promise<void>;
  /** Records last use for keys that don't consume credits (subscriptions). */
  touchKey(keyId: string): Promise<void>;
  recordUsage(usage: UsageRecord): Promise<void>;
}
