import { cents, computeOrderTotals, generateApiKey, toPayPalValue } from "@mrstockd/core";
import { and, type AnyDb, apiKeys, auditLog, desc, eq, inArray, isNull, listings, orders, paypalWebhookEvents, sellers } from "@mrstockd/db";
import { CatalogError } from "./errors.js";

/**
 * The credit-purchase order lifecycle.
 *
 * Amounts are always recomputed here from the database listing row
 * (`computeOrderTotals`); nothing is ever taken from the request. A capture
 * is verified against the stored order (status, amount, currency) before a
 * key is issued, and `completeOrder` is idempotent inside one transaction,
 * so a buyer who retries, or a webhook racing the capture route, results in
 * exactly one order and one API key.
 */

export interface OrdersDeps {
  db: AnyDb;
  now?: () => Date;
}

/** What the client sends: nothing but which tool and how many packs. */
export interface StartedPurchase {
  orderId: string;
  /** Sent as PayPal-Request-Id. Fixed at order creation, so retries reuse it. */
  paypalRequestId: string;
  /** PayPal amount string, e.g. "9.98", computed from the database price. */
  amount: string;
  currency: string;
  /** What the buyer is paying for, for the PayPal order description. */
  description: string;
  slug: string;
}

/** A capture resource as reported by PayPal's create/capture/get responses. */
export interface CaptureInput {
  captureId: string;
  /** Must be "COMPLETED". */
  status: string;
  /** "9.98"-style string straight from the capture. */
  amount: string;
  currency: string;
}

export interface CompletedKey {
  /** Full key, shown to the buyer once. Never stored. */
  key: string;
  prefix: string;
  creditsRemaining: number;
}

export type CompletionOutcome = { status: "completed"; key: CompletedKey } | { status: "already_completed" };

/** What the capture route may read of its own order before capturing. */
export interface BuyerOrder {
  id: string;
  status: "created" | "approved" | "completed" | "refunded" | "failed";
  paypalOrderId: string;
  paypalRequestId: string;
  slug: string;
  toolName: string;
  quantity: number;
  subtotalCents: number;
  currency: string;
}

/** One key for /account/keys. */
export interface KeyRow {
  id: string;
  prefix: string;
  environment: "live" | "test";
  creditsRemaining: number;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  toolName: string;
  toolSlug: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Malformed ids are simply "not found", rather than a database error. */
function assertOrderId(orderId: string): void {
  if (!UUID.test(orderId)) throw new CatalogError("not_found", "Order not found.");
}

export function createOrders(deps: OrdersDeps) {
  const { db } = deps;
  const now = deps.now ?? (() => new Date());

  async function audit(
    actorId: string,
    actorKind: string,
    action: string,
    subject: { type: string; id: string },
    metadata?: Record<string, unknown>,
  ) {
    await db.insert(auditLog).values({ actorId, actorKind, action, subjectType: subject.type, subjectId: subject.id, metadata });
  }

  function ownedKeys(condition: ReturnType<typeof and>) {
    return db
      .select({
        id: apiKeys.id,
        prefix: apiKeys.prefix,
        environment: apiKeys.environment,
        creditsRemaining: apiKeys.creditsRemaining,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt,
        revokedAt: apiKeys.revokedAt,
        toolName: listings.name,
        toolSlug: listings.slug,
      })
      .from(apiKeys)
      .innerJoin(listings, eq(listings.id, apiKeys.listingId))
      .where(condition)
      .orderBy(desc(apiKeys.createdAt));
  }

  return {
    /* ----------------------- Starting a purchase ----------------------- */

    /**
     * Creates an order for `packs` credit packs of a live, credit-priced tool.
     * The amount is computed from the listing's stored price, never from the
     * caller. Returns everything the PayPal create call needs.
     */
    async startCreditPurchase(buyerId: string, slug: string, packs: number): Promise<StartedPurchase> {
      if (!Number.isSafeInteger(packs) || packs < 1 || packs > 10) {
        throw new CatalogError("validation", "Choose between 1 and 10 packs.", { packs: "Pick 1–10 packs." });
      }
      const trimmed = slug.trim().slice(0, 200);
      const [row] = await db
        .select({ listing: listings })
        .from(listings)
        .where(and(eq(listings.slug, trimmed), eq(listings.status, "live")))
        .limit(1);
      // Not live, or a subscription tool: the same response either way, so
      // drafts and paused tools can't be probed.
      if (!row) throw new CatalogError("not_found", "Tool not found.");
      if (row.listing.pricingModel !== "credits") {
        throw new CatalogError("validation", "This tool uses a monthly plan.", {
          packs: "Monthly subscriptions aren't available yet. Look for credit-pack tools.",
        });
      }

      const totals = computeOrderTotals(cents(row.listing.unitPriceCents), packs);
      const [order] = await db
        .insert(orders)
        .values({
          buyerId,
          listingId: row.listing.id,
          quantity: packs,
          subtotalCents: totals.subtotal,
          platformFeeCents: totals.platformFee,
          sellerPayoutCents: totals.sellerPayout,
          currency: "USD",
          status: "created",
        })
        .returning({ id: orders.id, paypalRequestId: orders.paypalRequestId });
      return {
        orderId: order!.id,
        paypalRequestId: order!.paypalRequestId,
        amount: toPayPalValue(totals.subtotal),
        currency: "USD",
        description: `${row.listing.name} — ${packs} credit pack${packs === 1 ? "" : "s"}`,
        slug: row.listing.slug,
      };
    },

    /** Called right after PayPal.createOrder so the row links to the PayPal order. */
    async savePayPalOrderId(orderId: string, paypalOrderId: string): Promise<void> {
      await db
        .update(orders)
        .set({ paypalOrderId, updatedAt: now() })
        .where(and(eq(orders.id, orderId), eq(orders.status, "created"), isNull(orders.paypalOrderId)));
    },

    /** The buyer's own order (anyone else's looks missing). 404s if there's no PayPal order yet. */
    async getOwnOrder(orderId: string, buyerId: string): Promise<BuyerOrder> {
      assertOrderId(orderId);
      const [row] = await db
        .select({ order: orders, listing: listings })
        .from(orders)
        .innerJoin(listings, eq(listings.id, orders.listingId))
        .where(and(eq(orders.id, orderId), eq(orders.buyerId, buyerId)))
        .limit(1);
      if (!row) throw new CatalogError("not_found", "Order not found.");
      if (row.order.paypalOrderId === null) throw new CatalogError("not_found", "Order not found.");
      return {
        id: row.order.id,
        status: row.order.status,
        paypalOrderId: row.order.paypalOrderId,
        paypalRequestId: row.order.paypalRequestId,
        slug: row.listing.slug,
        toolName: row.listing.name,
        quantity: row.order.quantity,
        subtotalCents: row.order.subtotalCents,
        currency: row.order.currency,
      };
    },

    /* ----------------------- Completing a purchase --------------------- */

    /**
     * Marks a paid order completed and issues its API key, inside one
     * transaction, so a capture retry or a racing webhook can never issue
     * two. The capture must be COMPLETED and its amount and currency must
     * match the stored order. The plaintext key comes back only on the first
     * completion; every repeat answers "already_completed" with no key.
     */
    async completeOrder(orderId: string, capture: CaptureInput): Promise<CompletionOutcome> {
      assertOrderId(orderId);
      return db.transaction(async (tx) => {
        const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update").limit(1);
        if (!order) throw new CatalogError("not_found", "Order not found.");

        // Verify the capture against the order we stored, before anything else,
        // so even a wrongly-replayed completion is refused.
        if (capture.status !== "COMPLETED") {
          throw new CatalogError("capture_failed", "The payment did not complete. You haven't been charged.");
        }
        if (capture.amount !== toPayPalValue(cents(order.subtotalCents)) || (capture.currency ?? "").toUpperCase() !== order.currency.toUpperCase()) {
          throw new CatalogError("amount_mismatch", "The payment doesn't match the order. No key was issued.");
        }

        const [existingKey] = await tx.select().from(apiKeys).where(eq(apiKeys.orderId, order.id)).limit(1);
        if (order.status === "completed" || existingKey) return { status: "already_completed" as const };

        const [listing] = await tx.select().from(listings).where(eq(listings.id, order.listingId)).limit(1);
        const at = now();
        const credits = listing!.creditsPerUnit * order.quantity;

        // One live key, owned by the buyer, carrying creditsPerUnit x packs
        // credits. Same generation as the seller's test keys, environment live.
        const issued = generateApiKey("live");
        await tx.insert(apiKeys).values({
          ownerId: order.buyerId,
          listingId: order.listingId,
          orderId: order.id,
          environment: "live",
          prefix: issued.prefix,
          keyHash: issued.hash,
          creditsRemaining: credits,
        });
        await tx
          .update(orders)
          .set({ status: "completed", updatedAt: at })
          .where(and(eq(orders.id, order.id), inArray(orders.status, ["created", "approved"])));
        await tx.insert(auditLog).values([
          {
            actorId: order.buyerId,
            actorKind: "user",
            action: "order.completed",
            subjectType: "order",
            subjectId: order.id,
            metadata: { captureId: capture.captureId, amount: capture.amount, currency: order.currency },
          },
          {
            actorId: order.buyerId,
            actorKind: "user",
            action: "key.issued",
            subjectType: "listing",
            subjectId: order.listingId,
            metadata: { orderId: order.id, prefix: issued.prefix, credits },
          },
        ]);
        return { status: "completed" as const, key: { key: issued.key, prefix: issued.prefix, creditsRemaining: credits } };
      });
    },

    /* ------------------------- Reversing orders ------------------------ */

    /** Marks an order refunded and stops its key. Idempotent. */
    async refundOrder(orderId: string): Promise<void> {
      assertOrderId(orderId);
      await db.transaction(async (tx) => {
        const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update").limit(1);
        if (!order) throw new CatalogError("not_found", "Order not found.");
        if (order.status === "refunded") return;
        const at = now();
        await tx.update(orders).set({ status: "refunded", updatedAt: at }).where(eq(orders.id, order.id));
        const revoked = await tx
          .update(apiKeys)
          .set({ revokedAt: at, updatedAt: at })
          .where(and(eq(apiKeys.orderId, order.id), isNull(apiKeys.revokedAt)))
          .returning({ prefix: apiKeys.prefix });
        await tx.insert(auditLog).values([
          { actorId: order.buyerId, actorKind: "system", action: "order.refunded", subjectType: "order", subjectId: order.id, metadata: { at: at.toISOString() } },
          ...(revoked.length
            ? [{ actorId: order.buyerId, actorKind: "system", action: "key.revoked", subjectType: "listing", subjectId: order.listingId, metadata: { orderId: order.id, reason: "refund" } }]
            : []),
        ]);
      });
    },

    /** Marks an unpaid order failed and stops its key, if one was somehow issued. */
    async failOrder(orderId: string): Promise<void> {
      assertOrderId(orderId);
      await db.transaction(async (tx) => {
        const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update").limit(1);
        if (!order) throw new CatalogError("not_found", "Order not found.");
        if (order.status === "failed") return;
        if (order.status === "completed") {
          throw new CatalogError("invalid_transition", "A completed order can't be marked failed. Refund it instead.");
        }
        const at = now();
        await tx.update(orders).set({ status: "failed", updatedAt: at }).where(eq(orders.id, order.id));
        const revoked = await tx
          .update(apiKeys)
          .set({ revokedAt: at, updatedAt: at })
          .where(and(eq(apiKeys.orderId, order.id), isNull(apiKeys.revokedAt)))
          .returning({ prefix: apiKeys.prefix });
        await tx.insert(auditLog).values([
          { actorId: order.buyerId, actorKind: "system", action: "order.failed", subjectType: "order", subjectId: order.id, metadata: { at: at.toISOString() } },
          ...(revoked.length
            ? [{ actorId: order.buyerId, actorKind: "system", action: "key.revoked", subjectType: "listing", subjectId: order.listingId, metadata: { orderId: order.id, reason: "failed" } }]
            : []),
        ]);
      });
    },

    /* --------------------------- Webhooks ------------------------------ */

    /**
     * Records a PayPal webhook event id once. Returns false when the event
     * was already stored, so replays are ignored before any order logic runs.
     */
    async storeWebhookEvent(event: { id: string; eventType: string; payload: unknown }): Promise<boolean> {
      const stored = await db
        .insert(paypalWebhookEvents)
        .values({ eventId: event.id, eventType: event.eventType, payload: event.payload as object })
        .onConflictDoNothing({ target: paypalWebhookEvents.eventId })
        .returning({ eventId: paypalWebhookEvents.eventId });
      return stored.length > 0;
    },

    /** Marks a stored event as handled, so its processing is auditable. */
    async markWebhookEventProcessed(eventId: string): Promise<void> {
      await db.update(paypalWebhookEvents).set({ processedAt: now() }).where(eq(paypalWebhookEvents.eventId, eventId));
    },

    /** The order a PayPal capture/refund/denial refers to, by its PayPal order id. */
    async findOrderByPaypalOrder(paypalOrderId: string) {
      const [row] = await db
        .select({ id: orders.id, status: orders.status, buyerId: orders.buyerId, listingId: orders.listingId })
        .from(orders)
        .innerJoin(listings, eq(listings.id, orders.listingId))
        .where(eq(orders.paypalOrderId, paypalOrderId))
        .limit(1);
      return row ?? null;
    },

    /* ----------------------- Sellers and buyers ------------------------ */

    /** True when this user is the seller who owns a listing, so they can't buy their own tool. */
    async isOwnSeller(userId: string, listingId: string): Promise<boolean> {
      if (!UUID.test(listingId)) return false;
      const [row] = await db
        .select({ id: listings.id })
        .from(listings)
        .innerJoin(sellers, eq(sellers.id, listings.sellerId))
        .where(and(eq(listings.id, listingId), eq(sellers.ownerId, userId)))
        .limit(1);
      return row !== undefined;
    },

    /** Every key the buyer owns, live and test, newest first, for /account/keys. */
    listBuyerKeys(ownerId: string): Promise<KeyRow[]> {
      return ownedKeys(eq(apiKeys.ownerId, ownerId));
    },

    /** Revokes one of the buyer's own keys if it isn't already revoked. */
    async revokeKey(ownerId: string, keyId: string): Promise<boolean> {
      if (!UUID.test(keyId)) throw new CatalogError("not_found", "Key not found.");
      const at = now();
      const revoked = await db
        .update(apiKeys)
        .set({ revokedAt: at, updatedAt: at })
        .where(and(eq(apiKeys.id, keyId), eq(apiKeys.ownerId, ownerId), isNull(apiKeys.revokedAt)))
        .returning({ prefix: apiKeys.prefix, listingId: apiKeys.listingId });
      if (!revoked.length) return false;
      await audit(ownerId, "user", "key.revoked", { type: "listing", id: revoked[0]!.listingId }, { prefix: revoked[0]!.prefix, selfRevoked: true });
      return true;
    },
  };
}
