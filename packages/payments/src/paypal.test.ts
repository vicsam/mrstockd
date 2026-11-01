import { beforeEach, describe, expect, it } from "vitest";
import { createPayPal, firstCapture, type PayPalCaptureResult, PayPalError, type PayPalOrderResult, paypalIssue } from "./paypal.js";

/**
 * The client is exercised against a recorded-then-replayed fetch, so these
 * tests pin the exact requests MrStockd makes of PayPal: URLs, methods,
 * headers (PayPal-Request-Id!) and bodies.
 */
interface RecordedCall {
  url: string;
  method: string;
  authorization: string;
  requestId: string | null;
  body: unknown;
}

let calls: RecordedCall[] = [];

// From PayPal's docs, always true.
const TEN_DAYS_IN_SECONDS = 10 * 24 * 60 * 60;

function record(url: string, init?: RequestInit): RecordedCall {
  const call: RecordedCall = {
    url,
    method: init?.method ?? "GET",
    authorization: String((init?.headers as Record<string, string> | undefined)?.Authorization ?? ""),
    requestId: ((init?.headers as Record<string, string> | undefined)?.["PayPal-Request-Id"] as string | null) ?? null,
    body: typeof init?.body === "string" ? JSON.parse(init.body) : (init?.body ?? null),
  };
  calls.push(call);
  return call;
}

function jsonResponse(res: unknown, status = 200): Response {
  return new Response(JSON.stringify(res), { status, headers: { "Content-Type": "application/json" } });
}

async function makePayPal(overrides: Partial<Parameters<typeof createPayPal>[0]> = {}) {
  return createPayPal({
    env: "sandbox",
    clientId: "client-id",
    clientSecret: "client-secret",
    webhookId: "webhook-id",
    ...overrides,
  });
}

beforeEach(() => {
  calls = [];
});

describe("token handling", () => {
  it("fetches an OAuth token once and caches it until just before expiry", async () => {
    let clock = 0;
    const paypal = await makePayPal({
      now: () => clock,
      fetchImpl: async (url, init) => {
        record(String(url), init);
        return jsonResponse({ access_token: "tok-1", expires_in: TEN_DAYS_IN_SECONDS });
      },
    });
    await paypal.createOrder({
      requestId: "req-1",
      amount: "9.98",
      currency: "USD",
      returnUrl: "https://x/return",
      cancelUrl: "https://x/cancel",
    });
    await paypal.getOrder("order-1");
    await paypal.getOrder("order-2");

    const tokenCalls = calls.filter((c) => c.url.endsWith("/v1/oauth2/token"));
    expect(tokenCalls).toHaveLength(1);
    expect(tokenCalls[0]!.method).toBe("POST");
    // Basic auth header, so secrets never appear in a URL or query string.
    expect(tokenCalls[0]!.authorization).toBe(`Basic ${Buffer.from("client-id:client-secret").toString("base64")}`);

    // Advance the clock past the token's life minus the safety margin: a new token is fetched.
    clock = 60_000 * 60 * 24 * 10;
    await paypal.getOrder("order-3");
    expect(calls.filter((c) => c.url.endsWith("/v1/oauth2/token"))).toHaveLength(2);
  });

  it("retries once with a fresh token after a 401", async () => {
    const paypal = await makePayPal({
      fetchImpl: async (url, init) => {
        const call = record(String(url), init);
        if (call.url.endsWith("/v1/oauth2/token")) return jsonResponse({ access_token: `tok-${calls.length}`, expires_in: 3600 });
        const orderCalls = calls.filter((c) => c.url.includes("/v2/checkout/orders/")).length;
        return orderCalls === 1 ? jsonResponse({ name: "INVALID_RESOURCE_ID" }, 401) : jsonResponse({ id: "order-1", status: "APPROVED" });
      },
    });
    const order = await paypal.getOrder("order-1");
    expect(order.status).toBe("APPROVED");
    expect(calls.filter((c) => c.url !== undefined && c.url.includes("/v2/checkout/orders/order-1")).length).toBe(2);
  });
});

describe("orders", () => {
  it("creates an order in the sandbox with the PayPal-Request-Id from the caller", async () => {
    const paypal = await makePayPal({
      fetchImpl: async (url, init) => {
        const call = record(String(url), init);
        return call.url.endsWith("/v1/oauth2/token")
          ? jsonResponse({ access_token: "tok", expires_in: 3600 })
          : jsonResponse({ id: "order-1", status: "CREATED" });
      },
    });
    const created = await paypal.createOrder({
      requestId: "0123abcd-1111-2222-3333-444455556666",
      amount: "9.98",
      currency: "USD",
      description: "Some tool — 2 credit pack(s)",
      returnUrl: "https://mrstockd.test/tools/some-tool",
      cancelUrl: "https://mrstockd.test/tools/some-tool",
      brandName: "MrStockd",
    });
    expect(created).toEqual<PayPalOrderResult>({ id: "order-1", status: "CREATED" });

    const call = calls[1]!;
    expect(call.url).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders");
    expect(call.method).toBe("POST");
    expect(call.requestId).toBe("0123abcd-1111-2222-3333-444455556666");
    const body = call.body as { intent: string; purchase_units: { amount: { value: string; currency_code: string } }[] };
    expect(body.intent).toBe("CAPTURE");
    expect(body.purchase_units[0]!.amount).toEqual({ value: "9.98", currency_code: "USD" });
  });

  it("captures with the same PayPal-Request-Id, and reads orders back", async () => {
    const paypal = await makePayPal({
      fetchImpl: async (url, init) => {
        const call = record(String(url), init);
        if (call.url.endsWith("/v1/oauth2/token")) return jsonResponse({ access_token: "tok", expires_in: 3600 });
        if (call.method === "POST") {
          return jsonResponse({
            id: "order-1",
            status: "COMPLETED",
            purchase_units: [{ payments: { captures: [{ id: "cap-1", status: "COMPLETED", amount: { currency_code: "USD", value: "9.98" } }] } }],
          });
        }
        return jsonResponse({ id: "order-1", status: "COMPLETED", purchase_units: [] });
      },
    });
    const captured = await paypal.captureOrder("order-1", "req-id-1");
    expect(firstCapture(captured)).not.toBeNull();
    expect(firstCapture(captured)!.id).toBe("cap-1");

    expect(calls[1]!.url).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders/order-1/capture");
    expect(calls[1]!.method).toBe("POST");
    expect(calls[1]!.requestId).toBe("req-id-1");

    await paypal.getOrder("order-1");
    expect(calls[2]!.method).toBe("GET");
    expect(calls[2]!.requestId).toBeNull();
  });

  it("points at the live base URL when env is live", async () => {
    const paypal = await makePayPal({
      env: "live",
      fetchImpl: async (url, init) => {
        const call = record(String(url), init);
        return call.url.endsWith("/v1/oauth2/token") ? jsonResponse({ access_token: "tok", expires_in: 3600 }) : jsonResponse({ id: "o", status: "CREATED" });
      },
    });
    await paypal.createOrder({ requestId: "r", amount: "1.00", currency: "USD", returnUrl: "https://x/r", cancelUrl: "https://x/c" });
    expect(calls[1]!.url).toBe("https://api-m.paypal.com/v2/checkout/orders");
  });

  it("throws a PayPalError with the parsed details on failure", async () => {
    const paypal = await makePayPal({
      fetchImpl: async (url, init) => {
        const call = record(String(url), init);
        return call.url.endsWith("/v1/oauth2/token")
          ? jsonResponse({ access_token: "tok", expires_in: 3600 })
          : jsonResponse({ name: "INVALID_RESOURCE_ID", message: "invalid" }, 404);
      },
    });
    await expect(paypal.captureOrder("missing", "r")).rejects.toMatchObject<PayPalError>({
      name: "PayPalError",
      status: 404,
      details: { name: "INVALID_RESOURCE_ID" },
    });
  });
});

describe("webhook signature verification", () => {
  it("posts the transmission headers and raw event, and returns true on SUCCESS", async () => {
    const event = { id: "event-1", event_type: "PAYMENT.CAPTURE.COMPLETED" };
    const paypal = await makePayPal({
      fetchImpl: async (url, init) => {
        const call = record(String(url), init);
        return call.url.endsWith("/v1/oauth2/token") ? jsonResponse({ access_token: "tok", expires_in: 3600 }) : jsonResponse({ status: "SUCCESS" });
      },
    });
    const ok = await paypal.verifyWebhookSignature({
      authAlgo: "RSA-SHA256",
      certUrl: "https://api-m.paypal.com/v1/notifications/certs/CERT",
      transmissionId: "t-id",
      transmissionSig: "sig",
      transmissionTime: "2026-11-01T00:00:00Z",
      event,
    });
    expect(ok).toBe(true);

    const verification = calls[1]!;
    expect(verification.url).toBe("https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature");
    const body = verification.body as {
      webhook_id: string;
      auth_algo: string;
      transmission_id: string;
      transmission_time: string;
      cert_url: string;
      transmission_sig: string;
      webhook_event: unknown;
    };
    expect(body.webhook_id).toBe("webhook-id");
    expect(body.auth_algo).toBe("RSA-SHA256");
    expect(body.transmission_id).toBe("t-id");
    expect(body.transmission_sig).toBe("sig");
    expect(body.transmission_time).toBe("2026-11-01T00:00:00Z");
    expect(body.webhook_event).toEqual(event);
  });

  it("returns false when PayPal reports a failure", async () => {
    const paypal = await makePayPal({
      fetchImpl: async (url, init) => {
        const call = record(String(url), init);
        return call.url.endsWith("/v1/oauth2/token") ? jsonResponse({ access_token: "tok", expires_in: 3600 }) : jsonResponse({ status: "FAILURE" });
      },
    });
    expect(
      await paypal.verifyWebhookSignature({
        authAlgo: "RSA-SHA256",
        certUrl: "https://x/certs/CERT",
        transmissionId: "t",
        transmissionSig: "bad",
        transmissionTime: "2026-11-01T00:00:00Z",
        event: {},
      }),
    ).toBe(false);
  });
});

describe("helpers", () => {
  it("extracts the flag of an already-captured order", () => {
    expect(paypalIssue(new PayPalError("failed", 422, { name: "ORDER_ALREADY_CAPTURED" }))).toBe("ORDER_ALREADY_CAPTURED");
    expect(paypalIssue(new PayPalError("failed", 422, { issues: [{ issue: "ANOTHER_ISSUE" }] }))).toBe("ANOTHER_ISSUE");
    expect(paypalIssue(new Error("not paypal"))).toBeNull();
  });

  it("ignores missing captures", () => {
    expect(firstCapture(null)).toBeNull();
    expect(firstCapture({} as PayPalCaptureResult)).toBeNull();
  });
});
