import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/orders", () => ({ getOrders: vi.fn() }));
vi.mock("@/lib/paypal", () => ({ getPayPal: vi.fn() }));

import * as ordersLib from "@/lib/orders";
import * as paypalLib from "@/lib/paypal";
import { POST } from "@/app/api/paypal/webhook/route";

const VALID_HEADERS = {
  "paypal-auth-algo": "SHA256withRSA",
  "paypal-cert-url": "https://api.paypal.com/v1/notifications/certs/CERT",
  "paypal-transmission-id": "t-id",
  "paypal-transmission-sig": "sig",
  "paypal-transmission-time": "2026-11-01T00:00:00Z",
} as const;

describe("paypal webhook route", () => {
  let ordersMock: any;
  let paypalMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    ordersMock = {
      storeWebhookEvent: vi.fn().mockResolvedValue(true),
      getWebhookEvent: vi.fn().mockResolvedValue({ processedAt: new Date() }),
      markWebhookEventProcessed: vi.fn().mockResolvedValue(undefined),
      findOrderByPaypalOrder: vi.fn().mockResolvedValue({ id: "order-1", status: "created", currency: "USD" }),
      completeOrder: vi.fn().mockResolvedValue({ status: "already_completed" }),
      refundOrder: vi.fn().mockResolvedValue(undefined),
      failOrder: vi.fn().mockResolvedValue(undefined),
    };
    paypalMock = {
      verifyWebhookSignature: vi.fn().mockResolvedValue(true),
    };
    (ordersLib.getOrders as any).mockReturnValue(ordersMock);
    (paypalLib.getPayPal as any).mockReturnValue(paypalMock);
  });

  function makeEvent(overrides: Record<string, unknown> = {}) {
    return {
      id: "evt-1",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        id: "cap-1",
        status: "COMPLETED",
        amount: { currency_code: "USD", value: "9.98" },
        supplementary_data: { related_ids: { order_id: "PP-1" } },
      },
      ...overrides,
    };
  }

  it("rejects a bad signature with 400", async () => {
    paypalMock.verifyWebhookSignature.mockResolvedValue(false);
    const res = await POST(
      new Request("http://localhost/api/paypal/webhook", {
        method: "POST",
        body: JSON.stringify(makeEvent()),
        headers: { "content-type": "application/json", ...VALID_HEADERS },
      }),
    );
    expect(res.status).toBe(400);
    expect(ordersMock.storeWebhookEvent).not.toHaveBeenCalled();
  });

  it("processes the same event once and returns 200 the second time", async () => {
    ordersMock.storeWebhookEvent.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const evt = makeEvent();
    const req1 = new Request("http://localhost/api/paypal/webhook", {
      method: "POST",
      body: JSON.stringify(evt),
      headers: { "content-type": "application/json", ...VALID_HEADERS },
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(200);
    const req2 = new Request("http://localhost/api/paypal/webhook", {
      method: "POST",
      body: JSON.stringify(evt),
      headers: { "content-type": "application/json", ...VALID_HEADERS },
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(200);
  });

  it("does not issue a second key when the order is already completed", async () => {
    ordersMock.findOrderByPaypalOrder.mockResolvedValue({ id: "order-1", status: "completed", currency: "USD" });
    ordersMock.completeOrder.mockResolvedValue({ status: "already_completed" });
    const res = await POST(
      new Request("http://localhost/api/paypal/webhook", {
        method: "POST",
        body: JSON.stringify(makeEvent()),
        headers: { "content-type": "application/json", ...VALID_HEADERS },
      }),
    );
    expect(res.status).toBe(200);
    expect(ordersMock.completeOrder).not.toHaveBeenCalled();
  });

  it("revokes the key on REFUNDED", async () => {
    ordersMock.findOrderByPaypalOrder.mockResolvedValue({ id: "order-1", status: "completed", currency: "USD" });
    const refundEvent = makeEvent({
      event_type: "PAYMENT.CAPTURE.REFUNDED",
      resource: {
        id: "refund-1",
        amount: { currency_code: "USD", value: "9.98" },
        supplementary_data: { related_ids: { order_id: "PP-1" } },
      },
    });
    const res = await POST(
      new Request("http://localhost/api/paypal/webhook", {
        method: "POST",
        body: JSON.stringify(refundEvent),
        headers: { "content-type": "application/json", ...VALID_HEADERS },
      }),
    );
    expect(res.status).toBe(200);
    expect(ordersMock.refundOrder).toHaveBeenCalledWith("order-1");
  });

  it("returns 200 for an unknown event type", async () => {
    const unknownEvent = makeEvent({ event_type: "SOMETHING.ELSE" });
    const res = await POST(
      new Request("http://localhost/api/paypal/webhook", {
        method: "POST",
        body: JSON.stringify(unknownEvent),
        headers: { "content-type": "application/json", ...VALID_HEADERS },
      }),
    );
    expect(res.status).toBe(200);
    expect(ordersMock.findOrderByPaypalOrder).not.toHaveBeenCalled();
  });

  it("reprocesses a stored-but-unprocessed event", async () => {
    ordersMock.storeWebhookEvent.mockResolvedValue(false);
    ordersMock.getWebhookEvent.mockResolvedValue({ processedAt: null });
    ordersMock.findOrderByPaypalOrder.mockResolvedValue({ id: "order-1", status: "created", currency: "USD" });
    ordersMock.completeOrder.mockResolvedValue({ status: "completed", key: { key: "k" } });
    const res = await POST(
      new Request("http://localhost/api/paypal/webhook", {
        method: "POST",
        body: JSON.stringify(makeEvent()),
        headers: { "content-type": "application/json", ...VALID_HEADERS },
      }),
    );
    expect(res.status).toBe(200);
    expect(ordersMock.completeOrder).toHaveBeenCalledWith("order-1", expect.anything());
  });

  it("returns 500 when a handler throws", async () => {
    ordersMock.storeWebhookEvent.mockResolvedValue(true);
    ordersMock.findOrderByPaypalOrder.mockResolvedValue({ id: "order-1", status: "created", currency: "USD" });
    ordersMock.completeOrder.mockRejectedValue(new Error("boom"));
    const res = await POST(
      new Request("http://localhost/api/paypal/webhook", {
        method: "POST",
        body: JSON.stringify(makeEvent()),
        headers: { "content-type": "application/json", ...VALID_HEADERS },
      }),
    );
    expect(res.status).toBe(500);
  });

  it("fails the order on PAYMENT.CAPTURE.DENIED", async () => {
    ordersMock.storeWebhookEvent.mockResolvedValue(true);
    ordersMock.findOrderByPaypalOrder.mockResolvedValue({ id: "order-1", status: "created", currency: "USD" });
    const deniedEvent = makeEvent({
      event_type: "PAYMENT.CAPTURE.DENIED",
      resource: { id: "cap-1", status: "DENIED", amount: { currency_code: "USD", value: "9.98" }, supplementary_data: { related_ids: { order_id: "PP-1" } } },
    });
    const res = await POST(
      new Request("http://localhost/api/paypal/webhook", {
        method: "POST",
        body: JSON.stringify(deniedEvent),
        headers: { "content-type": "application/json", ...VALID_HEADERS },
      }),
    );
    expect(res.status).toBe(200);
    expect(ordersMock.failOrder).toHaveBeenCalledWith("order-1");
  });
});