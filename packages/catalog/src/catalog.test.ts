import { randomBytes } from "node:crypto";
import { decryptSecret, parseEncryptionKey } from "@mrstockd/core";
import { apiKeys, auditLog, eq, listings, usageEvents } from "@mrstockd/db";
import { createTestDb } from "@mrstockd/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashApiKey } from "@mrstockd/core";
import { type Catalog, CatalogError, createCatalog, type ListingInput, parsePriceToCents, TEST_KEY_CREDITS, TEST_KEYS_PER_DAY } from "./index.js";

const key = parseEncryptionKey(randomBytes(32).toString("base64"));
let testDb: Awaited<ReturnType<typeof createTestDb>>;
let catalog: Catalog;

// A literal public IP avoids depending on DNS in tests.
const PUBLIC_ENDPOINT = "https://8.8.8.8/tool";

function listingInput(overrides: Partial<ListingInput> = {}): ListingInput {
  return {
    name: "Invoice Extractor",
    summary: "Turns supplier invoices into clean spreadsheet rows.",
    description: "Send a PDF or photo of an invoice and get back every line item, tax and total as structured JSON.",
    endpointUrl: PUBLIC_ENDPOINT,
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

/** Creates a seller with a live listing in one call. */
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
}, 60_000);

afterAll(async () => testDb?.close());

describe("prices", () => {
  it("parses plain amounts to cents and rejects everything else", () => {
    expect(parsePriceToCents("4.99")).toBe(499);
    expect(parsePriceToCents("$12")).toBe(1200);
    expect(parsePriceToCents("0.5")).toBe(50);
    for (const bad of ["", "abc", "4.999", "-1", "1e3", "1,000"]) expect(parsePriceToCents(bad)).toBeNull();
  });
});

describe("seller profiles", () => {
  it("creates one profile per account", async () => {
    const seller = await catalog.becomeSeller("owner-a", { displayName: "Lagos Labs" });
    expect(seller.displayName).toBe("Lagos Labs");
    expect(seller.payoutsEnabled).toBe(false);
    await expectCatalogError(catalog.becomeSeller("owner-a", { displayName: "Again" }), "already_a_seller");
  });

  it("validates the display name", async () => {
    const error = await expectCatalogError(catalog.becomeSeller("owner-x", { displayName: "A" }), "validation");
    expect(error.fieldErrors.displayName).toBeTruthy();
  });

  it("requires a profile before listing a tool", async () => {
    await expectCatalogError(catalog.createListing("no-profile", listingInput()), "not_a_seller");
  });
});

describe("creating listings", () => {
  it("starts as a draft, encrypts the secret, and never returns it", async () => {
    const listing = await catalog.createListing("owner-a", listingInput());
    expect(listing.status).toBe("draft");
    expect(listing.slug).toBe("invoice-extractor");
    expect(listing.unitPriceCents).toBe(499);
    expect(listing.hasSecret).toBe(true);
    expect(JSON.stringify(listing)).not.toContain("sk_seller_live_123");

    const [row] = await testDb.db.select().from(listings).where(eq(listings.id, listing.id));
    expect(row!.upstreamSecretEnc).not.toContain("sk_seller_live_123");
    expect(decryptSecret(row!.upstreamSecretEnc!, key)).toBe("sk_seller_live_123");
  });

  it("gives every listing a unique, permanent address", async () => {
    const second = await catalog.createListing("owner-a", listingInput());
    expect(second.slug).toBe("invoice-extractor-2");
    const renamed = await catalog.updateListing("owner-a", second.id, listingInput({ name: "Totally New Name" }));
    expect(renamed.slug).toBe("invoice-extractor-2");
  });

  it("reports every invalid field at once", async () => {
    const error = await expectCatalogError(
      catalog.createListing("owner-a", listingInput({ name: "x", price: "free", summary: "short" })),
      "validation",
    );
    expect(Object.keys(error.fieldErrors).sort()).toEqual(["name", "price", "summary"]);
  });

  it("rejects endpoints on private networks or without https", async () => {
    for (const endpointUrl of ["http://8.8.8.8/tool", "https://169.254.169.254/latest", "https://10.0.0.5/x", "https://localhost/x", "not a url"]) {
      const error = await expectCatalogError(catalog.createListing("owner-a", listingInput({ endpointUrl })), "unsafe_endpoint");
      expect(error.fieldErrors.endpointUrl).toMatch(/public https/);
    }
  });

  it("stores no secret when none is given", async () => {
    const listing = await catalog.createListing("owner-a", listingInput({ name: "Open Tool", upstreamSecret: "" }));
    expect(listing.hasSecret).toBe(false);
  });
});

describe("ownership", () => {
  it("hides other sellers' listings as if they didn't exist", async () => {
    await catalog.becomeSeller("owner-b", { displayName: "Other Seller" });
    const [mine] = await catalog.listMyListings("owner-a");
    const before = await catalog.getMyListing("owner-a", mine!.id);

    await expectCatalogError(catalog.getMyListing("owner-b", mine!.id), "not_found");
    await expectCatalogError(catalog.updateListing("owner-b", mine!.id, listingInput({ name: "Hijacked", endpointUrl: "https://1.1.1.1/evil" })), "not_found");
    await expectCatalogError(catalog.changeMyListingStatus("owner-b", mine!.id, "submit"), "not_found");
    expect((await catalog.listMyListings("owner-b")).map((l) => l.id)).not.toContain(mine!.id);

    // The failed attempts must not have changed anything.
    const after = await catalog.getMyListing("owner-a", mine!.id);
    expect(after).toEqual(before);
  });
});

describe("malformed ids", () => {
  it("are treated as not found, not as database errors", async () => {
    for (const id of ["not-a-uuid", "1", "'; drop table listings; --"]) {
      await expectCatalogError(catalog.getMyListing("owner-a", id), "not_found");
      await expectCatalogError(catalog.changeMyListingStatus("owner-a", id, "submit"), "not_found");
      await expectCatalogError(catalog.review("reviewer-1", id, "approve"), "not_found");
    }
    expect(await catalog.getPublicListingsByIds(["nope"])).toEqual([]);
  });
});

describe("lifecycle", () => {
  it("goes draft → review → live → paused → live, with a published date", async () => {
    const listing = await catalog.createListing("owner-a", listingInput({ name: "Lifecycle Tool" }));
    expect((await catalog.changeMyListingStatus("owner-a", listing.id, "submit")).status).toBe("in_review");
    expect((await catalog.listForReview()).map((l) => l.id)).toContain(listing.id);

    await catalog.review("reviewer-1", listing.id, "approve");
    const live = await catalog.getMyListing("owner-a", listing.id);
    expect(live.status).toBe("live");
    expect(live.publishedAt).toBeInstanceOf(Date);

    expect((await catalog.changeMyListingStatus("owner-a", listing.id, "pause")).status).toBe("paused");
    expect((await catalog.changeMyListingStatus("owner-a", listing.id, "resume")).status).toBe("live");
  });

  it("refuses transitions that skip review", async () => {
    const listing = await catalog.createListing("owner-a", listingInput({ name: "Shortcut Tool" }));
    await expectCatalogError(catalog.changeMyListingStatus("owner-a", listing.id, "resume"), "invalid_transition");
    await expectCatalogError(catalog.changeMyListingStatus("owner-a", listing.id, "pause"), "invalid_transition");
    await expectCatalogError(catalog.review("reviewer-1", listing.id, "approve"), "invalid_transition");
  });

  it("requires a reason to reject, shows it to the seller, and clears it on resubmit", async () => {
    const listing = await catalog.createListing("owner-a", listingInput({ name: "Rejected Tool" }));
    await catalog.changeMyListingStatus("owner-a", listing.id, "submit");
    await expectCatalogError(catalog.review("reviewer-1", listing.id, "reject", "  "), "validation");
    await catalog.review("reviewer-1", listing.id, "reject", "Endpoint returned errors during testing.");
    const rejected = await catalog.getMyListing("owner-a", listing.id);
    expect(rejected.status).toBe("rejected");
    expect(rejected.reviewNote).toMatch(/Endpoint returned errors/);

    const resubmitted = await catalog.changeMyListingStatus("owner-a", listing.id, "submit");
    expect(resubmitted.status).toBe("in_review");
    expect(resubmitted.reviewNote).toBeNull();
  });

  it("sends a live listing back to review when its endpoint or secret changes", async () => {
    const endpointSwap = await liveListing("owner-a", { name: "Swap Endpoint Tool" });
    const afterEndpoint = await catalog.updateListing("owner-a", endpointSwap.id, listingInput({ name: "Swap Endpoint Tool", endpointUrl: "https://1.1.1.1/other", upstreamSecret: "" }));
    expect(afterEndpoint.status).toBe("in_review");

    const secretSwap = await liveListing("owner-a", { name: "Swap Secret Tool" });
    const afterSecret = await catalog.updateListing("owner-a", secretSwap.id, listingInput({ name: "Swap Secret Tool", upstreamSecret: "new-secret" }));
    expect(afterSecret.status).toBe("in_review");
  });

  it("keeps a live listing live for text and price edits", async () => {
    const listing = await liveListing("owner-a", { name: "Text Edit Tool" });
    const edited = await catalog.updateListing("owner-a", listing.id, listingInput({ name: "Text Edit Tool", summary: "A clearer summary for buyers to read.", price: "5.99", upstreamSecret: "" }));
    expect(edited.status).toBe("live");
    expect(edited.unitPriceCents).toBe(599);
  });

  it("records an audit trail of status changes", async () => {
    const listing = await liveListing("owner-a", { name: "Audited Tool" });
    const events = await testDb.db.select().from(auditLog).where(eq(auditLog.subjectId, listing.id));
    expect(events.map((e) => e.action)).toEqual(expect.arrayContaining(["listing.created", "listing.submit", "listing.approve"]));
    expect(events.find((e) => e.action === "listing.approve")?.actorKind).toBe("reviewer");
  });
});

describe("the public store", () => {
  it("shows only live listings, without endpoint or secret", async () => {
    const draft = await catalog.createListing("owner-a", listingInput({ name: "Hidden Draft" }));
    expect(await catalog.getPublicListing(draft.slug)).toBeNull();

    const live = await liveListing("owner-a", { name: "Visible Tool" });
    const pub = await catalog.getPublicListing(live.slug);
    expect(pub?.name).toBe("Visible Tool");
    expect(pub?.sellerName).toBe("Lagos Labs");
    expect(Object.keys(pub!)).not.toEqual(expect.arrayContaining(["endpointUrl"]));
    expect(JSON.stringify(pub)).not.toMatch(/8\.8\.8\.8|sk_seller/);
  });
});

describe("search", () => {
  beforeAll(async () => {
    await catalog.becomeSeller("owner-s", { displayName: "Search Seller" });
    await liveListing("owner-s", { name: "Receipt Reader", summary: "Reads receipts and returns totals as JSON.", description: "Snap a photo of any receipt and get merchant, items and totals back in seconds." });
    await liveListing("owner-s", { name: "Yoruba Translator", summary: "Translates between Yoruba and English.", description: "Natural translations for chat, documents and voice notes.", pricingModel: "subscription", price: "9.00" });
    await liveListing("owner-s", { name: "PDF Summarizer", summary: "Summarizes long PDF documents in plain words.", description: "Upload contracts, reports or papers and get a short summary with key points." });
    const draft = await catalog.createListing("owner-s", listingInput({ name: "Secret Receipt Draft", summary: "Receipt tool that is not live yet." }));
    expect(draft.status).toBe("draft");
  });

  it("finds tools by meaning-bearing words, with stemming", async () => {
    const result = await catalog.search({ query: "receipts" });
    expect(result.items[0]?.name).toBe("Receipt Reader");
    expect(result.items.map((i) => i.name)).not.toContain("Secret Receipt Draft");
  });

  it("ranks name matches above description matches", async () => {
    const result = await catalog.search({ query: "summarize pdf" });
    expect(result.items[0]?.name).toBe("PDF Summarizer");
  });

  it("matches partial names as you type", async () => {
    expect((await catalog.search({ query: "yoru" })).items[0]?.name).toBe("Yoruba Translator");
  });

  it("filters by pricing model", async () => {
    const subs = await catalog.search({ pricingModel: "subscription" });
    expect(subs.items.length).toBeGreaterThan(0);
    expect(subs.items.every((i) => i.pricingModel === "subscription")).toBe(true);
  });

  it("lists the newest live tools when the query is empty", async () => {
    const result = await catalog.search({});
    expect(result.total).toBeGreaterThanOrEqual(3);
    expect(result.items.every((i) => i.publishedAt !== null)).toBe(true);
  });

  it("treats hostile input as plain text", async () => {
    for (const query of ["'; drop table listings; --", "%%%", "\\", "a:b & c | !d", "<script>"]) {
      await expect(catalog.search({ query })).resolves.toBeDefined();
    }
    expect((await catalog.search({ query: "zzzz-no-such-tool" })).items).toHaveLength(0);
  });

  it("caps page size", async () => {
    expect((await catalog.search({ limit: 1000 })).items.length).toBeLessThanOrEqual(50);
  });
});

describe("seller test keys", () => {
  async function draftListing(ownerId: string, input: Partial<ListingInput> = {}) {
    if (!(await catalog.getSeller(ownerId))) await catalog.becomeSeller(ownerId, { displayName: `Seller ${ownerId}` });
    return catalog.createListing(ownerId, listingInput(input));
  }

  it("issues a test key with free credits, stored only as a hash", async () => {
    const listing = await draftListing("tk-seller-1");
    const issued = await catalog.issueTestKey("tk-seller-1", listing.id);
    expect(issued.key).toMatch(/^mrs_test_[a-f0-9]{12}_/);
    expect(issued.creditsRemaining).toBe(TEST_KEY_CREDITS);

    const [row] = await testDb.db.select().from(apiKeys).where(eq(apiKeys.prefix, issued.prefix));
    expect(row!.environment).toBe("test");
    expect(row!.ownerId).toBe("tk-seller-1");
    expect(row!.keyHash).toBe(hashApiKey(issued.key));
    expect(JSON.stringify(row)).not.toContain(issued.key);
  });

  it("keeps one active test key per tool: a new one stops the old one", async () => {
    const listing = await draftListing("tk-seller-2");
    const first = await catalog.issueTestKey("tk-seller-2", listing.id);
    const second = await catalog.issueTestKey("tk-seller-2", listing.id);
    const rows = await testDb.db.select().from(apiKeys).where(eq(apiKeys.listingId, listing.id));
    expect(rows.find((r) => r.prefix === first.prefix)!.revokedAt).not.toBeNull();
    expect(rows.find((r) => r.prefix === second.prefix)!.revokedAt).toBeNull();
    expect((await catalog.getToolActivity("tk-seller-2", listing.id)).testKey?.prefix).toBe(second.prefix);
  });

  it("gives subscription tools a time-limited key instead of credits", async () => {
    const listing = await draftListing("tk-seller-3", { pricingModel: "subscription" });
    const issued = await catalog.issueTestKey("tk-seller-3", listing.id);
    expect(issued.creditsRemaining).toBe(0);
    expect(issued.validUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it("never issues, revokes, or shows activity for someone else's tool", async () => {
    const listing = await draftListing("tk-seller-4");
    await catalog.issueTestKey("tk-seller-4", listing.id);
    await expectCatalogError(catalog.issueTestKey("intruder", listing.id), "not_found");
    await expectCatalogError(catalog.revokeTestKey("intruder", listing.id), "not_found");
    await expectCatalogError(catalog.getToolActivity("intruder", listing.id), "not_found");
    expect((await catalog.getToolActivity("tk-seller-4", listing.id)).testKey).not.toBeNull();
  });

  it("revokes the current test key", async () => {
    const listing = await draftListing("tk-seller-5");
    await catalog.issueTestKey("tk-seller-5", listing.id);
    await catalog.revokeTestKey("tk-seller-5", listing.id);
    expect((await catalog.getToolActivity("tk-seller-5", listing.id)).testKey).toBeNull();
  });

  it("caps how many test keys a seller can make per tool per day", async () => {
    const listing = await draftListing("tk-seller-6");
    for (let i = 0; i < TEST_KEYS_PER_DAY; i++) await catalog.issueTestKey("tk-seller-6", listing.id);
    await expectCatalogError(catalog.issueTestKey("tk-seller-6", listing.id), "limit_reached");
  });

  it("summarises calls to the tool, telling test calls and failures apart", async () => {
    const listing = await draftListing("tk-seller-7");
    const issued = await catalog.issueTestKey("tk-seller-7", listing.id);
    const [key] = await testDb.db.select().from(apiKeys).where(eq(apiKeys.prefix, issued.prefix));
    await testDb.db.insert(usageEvents).values([
      { apiKeyId: key!.id, listingId: listing.id, statusCode: 200, latencyMs: 100, creditsUsed: 1 },
      { apiKeyId: key!.id, listingId: listing.id, statusCode: 502, latencyMs: 300, creditsUsed: 0 },
    ]);
    const activity = await catalog.getToolActivity("tk-seller-7", listing.id);
    expect(activity.last24h).toEqual({ calls: 2, testCalls: 2, failures: 1, avgLatencyMs: 200 });
    expect(activity.allTimeCalls).toBe(2);
    expect(activity.recent).toHaveLength(2);
    expect(activity.recent[0]!.environment).toBe("test");
  });
});
