import { getSession } from "@/lib/auth";
import { getOrders } from "@/lib/orders";
import { getPayPal } from "@/lib/paypal";
import { CatalogError } from "@mrstockd/catalog";
import { firstCapture, PayPalError, paypalIssue, type PayPalCaptureResult } from "@mrstockd/payments";

export const dynamic = "force-dynamic";

function statusFor(code: string): number {
  if (code === "not_found") return 404;
  if (code === "validation") return 400;
  if (code === "invalid_transition" || code === "capture_failed" || code === "amount_mismatch") return 409;
  return 500;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await context.params;
  try {
    const order = await getOrders().getOwnOrder(id, session.user.id);
    const paypal = getPayPal();
    let paypalResult;
    try {
      paypalResult = await paypal.captureOrder(order.paypalOrderId, order.paypalRequestId);
    } catch (e) {
      if (e instanceof PayPalError && paypalIssue(e) === "ORDER_ALREADY_CAPTURED") {
        paypalResult = await paypal.getOrder(order.paypalOrderId);
      } else {
        throw e;
      }
    }
    const capture = firstCapture(paypalResult as PayPalCaptureResult);
    if (capture) {
      const outcome = await getOrders().completeOrder(order.id, {
        captureId: capture.id,
        status: capture.status,
        amount: capture.amount.value,
        currency: capture.amount.currency_code,
      });
      if (outcome.status === "completed") {
        return Response.json({ status: "completed", key: outcome.key });
      }
      return Response.json({ status: "already_completed" });
    }
    return Response.json({ status: "already_completed" });
  } catch (e) {
    if (e instanceof CatalogError) {
      return Response.json({ error: e.code }, { status: statusFor(e.code) });
    }
    console.error("checkout capture failed", e);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}