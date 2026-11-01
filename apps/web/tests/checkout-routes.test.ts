import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogError } from "@mrstockd/catalog";
import { PayPalError } from "@mrstockd/payments";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/catalog", () => ({ getCatalog: vi.fn() }));
vi.mock("@/lib/orders", () => ({ getOrders: vi.fn() }));
vi.mock("@/lib/paypal", () => ({ getPayPal: vi.fn() }));

import * as auth from "@/lib/auth";
import * as catalogLib from "@/lib/catalog";
import * as ordersLib from "@/lib/orders";
import * as paypalLib from "@/lib/paypal";

import { POST as createOrder } from "@/app/api/checkout/orders/route";
import { POST as captureOrder } from "@/app/api/checkout/orders/[id]/capture/route";

const createOrders = vi.fn();
const createCatalog = vi.fn();
const createPayPal = vi.fn();

describe("checkout orders route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createCatalog.mockReturnValue({
      getPublicListing: vi.fn().mockResolvedValue({ id: "listing-1", slug: "tool" }),
    });
    createOrders.mockReturnValue({
      isOwnSeller: vi.fn().mockResolvedValue(false),
      startCreditPurchase: vi.fn().mockResolvedValue({
        orderId: "order-1",
        paypalRequestId: "req-1",
        amount: "9.98",
        currency: "USD",
        description: "Tool — 2 credit packs",
        slug: "tool",
      }),
      savePayPalOrderId: vi.fn().mockResolvedValue(undefined),
    });
    createPayPal.mockReturnValue({
      createOrder: vi.fn().mockResolvedValue({ id: "pp-order-1" }),
    });

    (catalogLib.getCatalog as any).mockImplementation(() => createCatalog());
    (ordersLib.getOrders as any).mockImplementation(() => createOrders());
    (paypalLib.getPayPal as any).mockImplementation(() => createPayPal());
    (auth.getSession as any).mockResolvedValue({ user: { id: "buyer-1" } });
  });

  it("ignores any amount in the body and uses the computed amount", async () => {
    const req = new Request("http://localhost/api/checkout/orders", {
      method: "POST",
      body: JSON.stringify({ slug: "tool", packs: 2, amount: "999.00" }),
    });
    const res = await createOrder(req);
    expect(res.status).toBe(200);
    const orders = createOrders();
    const paypal = createPayPal();
    expect(paypal.createOrder).toHaveBeenCalled();
    const call = paypal.createOrder.mock.calls[0][0];
    expect(call.amount).toBe("9.98");
  });

  it("refuses to let a seller buy their own tool", async () => {
    const orders = createOrders();
    orders.isOwnSeller.mockResolvedValue(true);
    const req = new Request("http://localhost/api/checkout/orders", {
      method: "POST",
      body: JSON.stringify({ slug: "tool", packs: 1 }),
    });
    const res = await createOrder(req);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "cannot_buy_own_tool" });
    expect(orders.startCreditPurchase).not.toHaveBeenCalled();
  });
});

describe("checkout capture route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const ordersApi = {
      getOwnOrder: vi.fn().mockResolvedValue({
        id: "order-1",
        status: "created",
        paypalOrderId: "pp-1",
        paypalRequestId: "req-1",
        slug: "tool",
        toolName: "Tool",
        quantity: 1,
        subtotalCents: 998,
        currency: "USD",
      }),
      completeOrder: vi.fn(),
    };
    createOrders.mockReturnValue(ordersApi);
    createPayPal.mockReturnValue({
      captureOrder: vi.fn().mockResolvedValue({
        purchase_units: [{ payments: { captures: [{ id: "cap-1", status: "COMPLETED", amount: { currency_code: "USD", value: "9.98" } }] } }],
      }),
      getOrder: vi.fn(),
    });
    (ordersLib.getOrders as any).mockImplementation(() => createOrders());
    (paypalLib.getPayPal as any).mockImplementation(() => createPayPal());
    (auth.getSession as any).mockResolvedValue({ user: { id: "buyer-1" } });
    (catalogLib.getCatalog as any).mockImplementation(() => createCatalog());
    createCatalog.mockReturnValue({ getPublicListing: vi.fn().mockResolvedValue(null) });
  });

  it("returns 404 for another user's order", async () => {
    const ordersApi = createOrders();
    ordersApi.getOwnOrder.mockRejectedValue(new CatalogError("not_found", "Order not found."));
    const req = new Request("http://localhost/api/checkout/orders/order-1/capture", { method: "POST" });
    const res = await captureOrder(req, { params: Promise.resolve({ id: "order-1" }) } as any);
    expect(res.status).toBe(404);
  });

  it("issues a key on the first capture and already_completed on the second", async () => {
    const ordersApi = createOrders();
    const paypal = createPayPal();
    let done = false;
    ordersApi.completeOrder.mockImplementation(async () => {
      if (done) return { status: "already_completed" };
      done = true;
      return { status: "completed", key: { key: "secret-key", prefix: "pk", creditsRemaining: 10 } };
    });

    // second capture attempt throws ORDER_ALREADY_CAPTURED, then getOrder returns the same capture
    let first = true;
    paypal.captureOrder.mockImplementation(async () => {
      if (first) {
        first = false;
        return { purchase_units: [{ payments: { captures: [{ id: "cap-1", status: "COMPLETED", amount: { currency_code: "USD", value: "9.98" } }] } }] };
      }
      throw new PayPalError("already captured", 422, { name: "ORDER_ALREADY_CAPTURED" });
    });
    paypal.getOrder.mockResolvedValue({
      purchase_units: [{ payments: { captures: [{ id: "cap-1", status: "COMPLETED", amount: { currency_code: "USD", value: "9.98" } }] } }],
    });

    const req1 = new Request("http://localhost/api/checkout/orders/order-1/capture", { method: "POST" });
    const res1 = await captureOrder(req1, { params: Promise.resolve({ id: "order-1" }) } as any);
    expect(res1.status).toBe(200);
    expect(await res1.json()).toMatchObject({ status: "completed", key: { key: "secret-key" } });

    const req2 = new Request("http://localhost/api/checkout/orders/order-1/capture", { method: "POST" });
    const res2 = await captureOrder(req2, { params: Promise.resolve({ id: "order-1" }) } as any);
    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2).toMatchObject({ status: "already_completed" });
    expect(json2.key).toBeUndefined();
  });
});