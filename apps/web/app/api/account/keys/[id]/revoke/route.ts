import { getSession } from "@/lib/auth";
import { getOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const ok = await getOrders().revokeKey(session.user.id, id);
  if (!ok) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ ok: true });
}