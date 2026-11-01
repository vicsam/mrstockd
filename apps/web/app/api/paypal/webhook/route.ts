import { getOrders } from "@/lib/orders";
import { getPayPal } from "@/lib/paypal";

export const dynamic = "force-dynamic";

function paypalOrderIdFromResource(resource: unknown): string | null {
  if (!resource || typeof resource !== "object" || Array.isArray(resource)) return null;
  const r = resource as Record<string, unknown>;
  const related = (r.supplementary_data as Record<string, unknown> | undefined)?.related_ids;
  if (related && typeof related === "object" && !Array.isArray(related)) {
    const orderId = (related as Record<string, unknown>).order_id;
    if (typeof orderId === "string" && orderId) return orderId;
  }
  const links = Array.isArray(r.links) ? (r.links as Array<Record<string, unknown>>) : [];
  for (const link of links) {
    const href = typeof link.href === "string" ? link.href : "";
    const match = href.match(/\/orders\/([^/?#]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }
  if (typeof r.paypal_order_id === "string" && r.paypal_order_id) return r.paypal_order_id;
  return null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const id = typeof event.id === "string" ? event.id : "";
  const eventType = typeof event.event_type === "string" ? event.event_type : "unknown";
  if (!id) return Response.json({ error: "missing_event_id" }, { status: 400 });

  const headers = {
    authAlgo: request.headers.get("paypal-auth-algo") ?? "",
    certUrl: request.headers.get("paypal-cert-url") ?? "",
    transmissionId: request.headers.get("paypal-transmission-id") ?? "",
    transmissionSig: request.headers.get("paypal-transmission-sig") ?? "",
    transmissionTime: request.headers.get("paypal-transmission-time") ?? "",
  };

  const paypal = getPayPal();
  let valid = false;
  try {
    valid = await paypal.verifyWebhookSignature({
      authAlgo: headers.authAlgo,
      certUrl: headers.certUrl,
      transmissionId: headers.transmissionId,
      transmissionSig: headers.transmissionSig,
      transmissionTime: headers.transmissionTime,
      event,
    });
  } catch {
    valid = false;
  }
  if (!valid) return Response.json({ error: "invalid_signature" }, { status: 400 });

  const orders = getOrders();
  const stored = await orders.storeWebhookEvent({ id, eventType, payload: event });

  // If the event was already stored, only reprocess it when it never finished.
  if (!stored) {
    const existing = await orders.getWebhookEvent(id);
    if (!existing || existing.processedAt !== null) {
      return Response.json({ received: true, duplicate: true }, { status: 200 });
    }
  }

  const resource = event.resource;
  try {
    switch (eventType) {
      case "PAYMENT.CAPTURE.COMPLETED": {
        const paypalOrderId = paypalOrderIdFromResource(resource);
        if (!paypalOrderId) {
          console.warn("paypal webhook: completed event has no order id", id);
          break;
        }
        const order = await orders.findOrderByPaypalOrder(paypalOrderId);
        if (!order) {
          console.warn("paypal webhook: unknown order", paypalOrderId, id);
          break;
        }
        if (order.status !== "completed") {
          const r = (resource ?? {}) as Record<string, unknown>;
          const amountObj = (r.amount ?? {}) as Record<string, unknown>;
          await orders.completeOrder(order.id, {
            captureId: typeof r.id === "string" ? r.id : "webhook",
            status: typeof r.status === "string" ? r.status : "COMPLETED",
            amount: typeof amountObj.value === "string" ? amountObj.value : "",
            currency: typeof amountObj.currency_code === "string" ? amountObj.currency_code : order.currency,
          });
        }
        break;
      }
      case "PAYMENT.CAPTURE.REFUNDED": {
        const paypalOrderId = paypalOrderIdFromResource(resource);
        if (!paypalOrderId) {
          console.warn("paypal webhook: refunded event has no order id", id);
          break;
        }
        const order = await orders.findOrderByPaypalOrder(paypalOrderId);
        if (!order) {
          console.warn("paypal webhook: unknown order", paypalOrderId, id);
          break;
        }
        await orders.refundOrder(order.id);
        break;
      }
      case "PAYMENT.CAPTURE.DENIED": {
        const paypalOrderId = paypalOrderIdFromResource(resource);
        if (!paypalOrderId) {
          console.warn("paypal webhook: denied event has no order id", id);
          break;
        }
        const order = await orders.findOrderByPaypalOrder(paypalOrderId);
        if (!order) {
          console.warn("paypal webhook: unknown order", paypalOrderId, id);
          break;
        }
        await orders.failOrder(order.id);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("paypal webhook: processing failed", e);
    return Response.json({ error: "processing_failed" }, { status: 500 });
  }

  try {
    await orders.markWebhookEventProcessed(id);
  } catch {
    // non-fatal
  }

  return Response.json({ received: true }, { status: 200 });
}