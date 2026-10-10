import { parseApiKeyPrefix } from "@mrstockd/core";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";

/**
 * The gateway sits between buyers (people or agents) and sellers' tools.
 * For each call it will:
 *   1. read the MrStockd API key from the Authorization header
 *   2. look it up by prefix and verify it against the stored hash
 *   3. check credits / subscription and rate limits
 *   4. re-run the SSRF guard on the listing's endpoint
 *   5. forward the request with the seller's decrypted upstream secret
 *   6. record a usage event
 *
 * Steps 2–6 are wired in once the database is provisioned.
 */
export const app = new Hono();

app.use("*", requestId());
app.use("*", secureHeaders());
app.use("/v1/*", bodyLimit({ maxSize: 5 * 1024 * 1024 }));

app.get("/health", (c) => c.json({ ok: true, service: "gateway" }));

app.all("/v1/tools/:slug/*", (c) => {
  const header = c.req.header("authorization") ?? "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const prefix = parseApiKeyPrefix(key);
  if (!prefix) {
    return c.json({ error: "missing_or_malformed_api_key" }, 401);
  }
  return c.json({ error: "not_implemented", slug: c.req.param("slug") }, 501);
});

app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "internal_error" }, 500);
});
