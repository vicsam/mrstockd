import { randomBytes } from "node:crypto";
import { cents, parseEncryptionKey, toPayPalValue } from "@mrstockd/core";
import { apiKeys, eq, orders, paypalWebhookEvents } from "@mrstockd/db";
import { createTestDb } from "@mrstockd/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Catalog, CatalogError, createCatalog, type ListingInput } from "./index.js";
import { createOrders } from "./orders.js";

const key = parseEncryptionKey(randomBytes(32).toString("base64"));
let testDb: Awaited<ReturnType<typeof createTestDb>>;
let catalog: Catalog;
let ordersApi: ReturnType<typeof createOrders>;

function listingInput(overrides: Partial<ListingInput> = {}): ListingInput {
  return {
    name: "Invoice Extractor",
    summary: "Turns supplier invoices into clean spreadsheet rows.",
    description: "Send a PDF or photo of an invoice and get back every line item, tax and total as structured JSON.",
    endpointUrl: "https://8.8.8.8/tool",
    pricingModel: "credits",
    price: "4.99",
    creditsPerUnit: 100,
    upstreamSecret: "sk_seller_live_123",
    ...overrides,
  };
}

async function expectCatalogError(promise: Promise<unknown>, code: CatalogError["code"]) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(CatalogError);
  expect((error as CatalogError).code).toBe(code);
  return error as CatalogError;
}

async function liveListing(ownerId: string, input: Partial<ListingInput> = {}) {
  if (!(await catalog.getSeller(ownerId))) await catalog.becomeSeller(ownerId, { displayName: `Seller ${ownerId}` });
  const listing = await catalog.createListing(ownerId, listingInput(input));
  await catalog.changeMyListingStatus(ownerId, listing.id, "submit");
  await catalog.review("reviewer-1", listing.id, "approve");
  return catalog.getMyListing(ownerId, listing.id);
}

beforeAll(async () => {
  testDb = await createTestDb();
  catalog = createCatalog({ db: testDb.db, encryptionKey: key, allowPrivateEndpoints: false });
  ordersApi = createOrders({ db: testDb.db });
}, 60_000);

afterAll(async () => testDb?.close());

describe("startCreditPurchase", () => {
  it("rejects packs outside 1-10", async () => {
    await expectCatalogError(ordersApi.startCreditPurchase("buyer-packs", "any-slug", 0), "validation");
    await expectCatalogError(ordersApi.startCreditPurchase("buyer-packs", "any-slug", 11), "validation");
  });

  it("rejects non-live listings", async () => {
    if (!(await catalog.getSeller("owner-draft"))) await catalog.becomeSeller("owner-draft", { displayName: "Seller owner-draft" });
    const listing = await catalog.createListing("owner-draft", listingInput());
    await expectCatalogError(ordersApi.startCreditPurchase("buyer-draft", listing.slug, 1), "not_found");
  });

  it("rejects non-credit listings", async () => {
    const listing = await liveListing("owner-sub", { pricingModel: "subscription", price: "4.99" });
    await expectCatalogError(ordersApi.startCreditPurchase("buyer-sub", listing.slug, 1), "validation");
  });

  it("computes the amount from the database price", async () => {
    const listing = await liveListing("owner-amount", { price: "4.99", creditsPerUnit: 100 });
    const started = await ordersApi.startCreditPurchase("buyer-amount", listing.slug, 3);
    expect(started.amount).toBe(toPayPalValue(cents(499 * 3)));
    expect(started.currency).toBe("USD");
    expect(started.slug).toBe(listing.slug);
    expect(started.description).toBe(`${listing.name} — 3 credit pack${3 === 1 ? "" : "s"}`);
  });
});

describe("completeOrder", () => {
  it("issues a live key with creditsPerUnit x packs on a COMPLETED capture", async () => {
    const listing = await liveListing("owner-complete", { price: "4.99", creditsPerUnit: 100 });
    const started = await ordersApi.startCreditPurchase("buyer-complete", listing.slug, 2);
    const result = await ordersApi.completeOrder(started.orderId, {
      captureId: "CAP-1",
      status: "COMPLETED",
      amount: started.amount,
      currency: "USD",
    });
    expect(result.status).toBe("completed");
    const key = (result as { status: "completed"; key: { creditsRemaining: number } }).key;
    expect(key.creditsRemaining).toBe(200);
    const keys = await testDb.db.select().from(apiKeys).where(eq(apiKeys.orderId, started.orderId));
    expect(keys).toHaveLength(1);
    expect(keys[0]!.environment).toBe("live");
  });

  it("is idempotent: a second call returns already_completed with no key", async () => {
    const listing = await liveListing("owner-idempotent", { price: "4.99", creditsPerUnit: 100 });
    const started = await ordersApi.startCreditPurchase("buyer-idempotent", listing.slug, 1);
    await ordersApi.completeOrder(started.orderId, {
      captureId: "CAP-X",
      status: "COMPLETED",
      amount: started.amount,
      currency: "USD",
    });
    const second = await ordersApi.completeOrder(started.orderId, {
      captureId: "CAP-Y",
      status: "COMPLETED",
      amount: started.amount,
      currency: "USD",
    });
    expect(second).toEqual({ status: "already_completed" });
    expect(Object.prototype.hasOwnProperty.call(second, "key")).toBe(false);
    const keys = await testDb.db.select().from(apiKeys).where(eq(apiKeys.orderId, started.orderId));
    expect(keys).toHaveLength(1);
  });

  it("refuses an amount mismatch", async () => {
    const listing = await liveListing("owner-mismatch", { price: "4.99", creditsPerUnit: 100 });
    const started = await ordersApi.startCreditPurchase("buyer-mismatch", listing.slug, 2);
    await expectCatalogError(
      ordersApi.completeOrder(started.orderId, {
        captureId: "CAP-M",
        status: "COMPLETED",
        amount: "9.99",
        currency: "USD",
      }),
      "amount_mismatch",
    );
  });

  it("refuses a currency mismatch", async () => {
    const listing = await liveListing("owner-curr", { price: "4.99", creditsPerUnit: 100 });
    const started = await ordersApi.startCreditPurchase("buyer-curr", listing.slug, 2);
    await expectCatalogError(
      ordersApi.completeOrder(started.orderId, {
        captureId: "CAP-C",
        status: "COMPLETED",
        amount: started.amount,
        currency: "EUR",
      }),
      "amount_mismatch",
    );
  });

  it("refuses a non-COMPLETED capture", async () => {
    const listing = await liveListing("owner-pending", { price: "4.99", creditsPerUnit: 100 });
    const started = await ordersApi.startCreditPurchase("buyer-pending", listing.slug, 1);
    await expectCatalogError(
      ordersApi.completeOrder(started.orderId, {
        captureId: "CAP-P",
        status: "PENDING",
        amount: started.amount,
        currency: "USD",
      }),
      "capture_failed",
    );
  });
});

describe("refundOrder and failOrder", () => {
  it("refunds an order and revokes its key", async () => {
    const listing = await liveListing("owner-refund", { price: "4.99", creditsPerUnit: 100 });
    const started = await ordersApi.startCreditPurchase("buyer-refund", listing.slug, 1);
    await ordersApi.completeOrder(started.orderId, {
      captureId: "CAP-R",
      status: "COMPLETED",
      amount: started.amount,
      currency: "USD",
    });
    await ordersApi.refundOrder(started.orderId);
    const [row] = await testDb.db.select().from(orders).where(eq(orders.id, started.orderId));
    expect(row!.status).toBe("refunded");
    const [key] = await testDb.db.select().from(apiKeys).where(eq(apiKeys.orderId, started.orderId));
    expect(key!.revokedAt).not.toBeNull();
  });

  it("marks an unpaid order failed", async () => {
    const listing = await liveListing("owner-fail", { price: "4.99", creditsPerUnit: 100 });
    const started = await ordersApi.startCreditPurchase("buyer-fail", listing.slug, 1);
    await ordersApi.failOrder(started.orderId);
    const [row] = await testDb.db.select().from(orders).where(eq(orders.id, started.orderId));
    expect(row!.status).toBe("failed");
  });
});

describe("storeWebhookEvent", () => {
  it("stores an event id once and returns false on replay", async () => {
    const first = await ordersApi.storeWebhookEvent({
      id: "evt-unique-1",
      eventType: "PAYMENT.CAPTURE.COMPLETED",
      payload: { id: "evt-unique-1" },
    });
    expect(first).toBe(true);
    const second = await ordersApi.storeWebhookEvent({
      id: "evt-unique-1",
      eventType: "PAYMENT.CAPTURE.COMPLETED",
      payload: { id: "evt-unique-1" },
    });
    expect(second).toBe(false);
    const rows = await testDb.db.select().from(paypalWebhookEvents);
    expect(rows.some((r) => r.eventId === "evt-unique-1")).toBe(true);
  });
});