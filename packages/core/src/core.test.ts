import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { assertSafeOutboundUrl, cents, computeOrderTotals, decryptSecret, encryptSecret, generateApiKey, isBlockedAddress, parseApiKeyPrefix, parseEncryptionKey, toPayPalValue, verifyApiKey } from "./index.js";

describe("secrets", () => {
  const key = parseEncryptionKey(randomBytes(32).toString("base64"));

  it("round-trips and uses a fresh IV each time", () => {
    const a = encryptSecret("sk_seller_123", key);
    const b = encryptSecret("sk_seller_123", key);
    expect(a).not.toBe(b);
    expect(decryptSecret(a, key)).toBe("sk_seller_123");
  });

  it("rejects tampering, wrong keys, and bad key sizes", () => {
    const stored = encryptSecret("secret", key);
    const parts = stored.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptSecret(parts.join("."), key)).toThrow();
    expect(() => decryptSecret(stored, parseEncryptionKey(randomBytes(32).toString("base64")))).toThrow();
    expect(() => parseEncryptionKey(randomBytes(16).toString("base64"))).toThrow();
  });
});

describe("money", () => {
  it("splits an order into fee and payout without losing cents", () => {
    const t = computeOrderTotals(cents(999), 3);
    expect(t.subtotal).toBe(2997);
    expect(t.platformFee + t.sellerPayout).toBe(t.subtotal);
    expect(toPayPalValue(t.subtotal)).toBe("29.97");
  });

  it("rejects bad quantities and amounts", () => {
    expect(() => computeOrderTotals(cents(100), 0)).toThrow();
    expect(() => cents(-1)).toThrow();
    expect(() => cents(1.5)).toThrow();
  });
});

describe("api keys", () => {
  it("issues a key that verifies against its hash only", () => {
    const issued = generateApiKey("test");
    expect(issued.key.startsWith("mrs_test_")).toBe(true);
    expect(parseApiKeyPrefix(issued.key)).toBe(issued.prefix);
    expect(verifyApiKey(issued.key, issued.hash)).toBe(true);
    expect(verifyApiKey(issued.key + "x", issued.hash)).toBe(false);
  });
});

describe("ssrf guard", () => {
  it("blocks private and internal addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "::1", "fd00::1", "::ffff:10.0.0.1"]) {
      expect(isBlockedAddress(ip)).toBe(true);
    }
    expect(isBlockedAddress("8.8.8.8")).toBe(false);
  });

  it("rejects unsafe URLs before any request", async () => {
    await expect(assertSafeOutboundUrl("http://example.com")).rejects.toThrow();
    await expect(assertSafeOutboundUrl("https://localhost/x")).rejects.toThrow();
    await expect(assertSafeOutboundUrl("https://169.254.169.254/latest")).rejects.toThrow();
    await expect(assertSafeOutboundUrl("https://user:pw@8.8.8.8")).rejects.toThrow();
  });
});
