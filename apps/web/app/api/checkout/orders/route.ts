import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { getOrders } from "@/lib/orders";
import { getPayPal } from "@/lib/paypal";
import { CatalogError } from "@mrstockd/catalog";

export const dynamic = "force-dynamic";

const schema = z.object({
  slug: z.string().trim().min(1).max(200),
  packs: z.number().int().min(1).max(10),
});

function statusFor(code: string): number {
  if (code === "not_found") return 404;
  if (code === "validation") return 400;
  if (code === "invalid_transition") return 409;
  return 500;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "validation" }, { status: 400 });

  const { slug, packs } = parsed.data;
  const userId = session.user.id;
  try {
    // A seller can't buy their own tool. The listing is resolved (live only)
    // before any order is created; a missing/draft listing simply skips the check.
    const listing = await getCatalog().getPublicListing(slug);
    if (listing) {
      const own = await getOrders().isOwnSeller(userId, listing.id);
      if (own) return Response.json({ error: "cannot_buy_own_tool" }, { status: 403 });
    }

    const started = await getOrders().startCreditPurchase(userId, slug, packs);
    const paypal = getPayPal();
    const origin = new URL(request.url).origin;
    const paypalOrder = await paypal.createOrder({
      requestId: started.paypalRequestId,
      amount: started.amount,
      currency: started.currency,
      description: started.description,
      returnUrl: `${origin}/tools/${started.slug}`,
      cancelUrl: `${origin}/tools/${started.slug}`,
      brandName: "MrStockd",
    });
    await getOrders().savePayPalOrderId(started.orderId, paypalOrder.id);
    return Response.json({ orderId: started.orderId, paypalOrderId: paypalOrder.id });
  } catch (e) {
    if (e instanceof CatalogError) {
      return Response.json({ error: e.code }, { status: statusFor(e.code) });
    }
    console.error("checkout create order failed", e);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}