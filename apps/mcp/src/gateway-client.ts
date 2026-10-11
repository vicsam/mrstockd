/**
 * Talks to the MrStockd gateway over HTTP. The MCP server has no database
 * access: everything goes through the same public API buyers' apps use, so
 * an agent can never do more than a buyer could.
 */

export interface PublicTool {
  slug: string;
  name: string;
  summary: string;
  description?: string;
  seller: string;
  pricing:
    | { model: "credits"; priceUsd: number; callsPerPack: number }
    | { model: "subscription"; priceUsd: number; period: "month" };
  storeUrl: string;
  callUrl: string;
  publishedAt: string | null;
}

export interface KeyInfo {
  environment: "live" | "test";
  tool: { slug: string; name: string; available: boolean };
  pricingModel: "credits" | "subscription";
  creditsRemaining: number | null;
  validUntil: string | null;
  callUrl: string;
}

export interface CallResult {
  status: number;
  creditsRemaining: number | null;
  testKey: boolean;
  contentType: string;
  body: string;
  /** Set when the gateway itself refused the call (bad key, no credits, …). */
  gatewayError?: { code: string; message: string };
}

export class GatewayError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

const GATEWAY_ERROR_CODES = new Set([
  "invalid_api_key",
  "api_key_revoked",
  "tool_not_found",
  "key_not_valid_for_tool",
  "tool_unavailable",
  "rate_limited",
  "subscription_inactive",
  "insufficient_credits",
  "upstream_misconfigured",
  "upstream_blocked",
  "upstream_timeout",
  "upstream_unavailable",
  "upstream_redirect",
]);

export interface GatewayClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export function createGatewayClient(options: GatewayClientOptions) {
  const base = options.baseUrl.replace(/\/+$/, "");
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 35_000;

  async function request(path: string, init: RequestInit = {}): Promise<Response> {
    try {
      return await doFetch(`${base}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (e) {
      const timedOut = (e as Error)?.name === "TimeoutError";
      throw new GatewayError(0, timedOut ? "gateway_timeout" : "gateway_unreachable", timedOut ? "MrStockd took too long to respond." : `Can't reach MrStockd at ${base}.`);
    }
  }

  async function json<T>(res: Response): Promise<T> {
    const body = (await res.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
    if (!res.ok) {
      throw new GatewayError(res.status, body?.error?.code ?? "http_error", body?.error?.message ?? `MrStockd answered ${res.status}.`);
    }
    return body as T;
  }

  return {
    async search(params: { query?: string; pricing?: "credits" | "subscription"; limit?: number }) {
      const qs = new URLSearchParams();
      if (params.query) qs.set("q", params.query);
      if (params.pricing) qs.set("pricing", params.pricing);
      qs.set("limit", String(params.limit ?? 10));
      return json<{ total: number; items: PublicTool[] }>(await request(`/v1/catalog/tools?${qs}`));
    },

    async getTool(slug: string): Promise<PublicTool | null> {
      const res = await request(`/v1/catalog/tools/${encodeURIComponent(slug)}`);
      if (res.status === 404) return null;
      return json<PublicTool>(res);
    },

    async keyInfo(key: string): Promise<KeyInfo> {
      return json<KeyInfo>(await request("/v1/keys/me", { headers: { authorization: `Bearer ${key}` } }));
    },

    async callTool(
      key: string,
      slug: string,
      call: { method: string; path: string; query?: Record<string, string>; input?: unknown },
    ): Promise<CallResult> {
      const qs = call.query && Object.keys(call.query).length ? `?${new URLSearchParams(call.query)}` : "";
      const hasBody = call.method !== "GET" && call.method !== "DELETE" && call.input !== undefined;
      const res = await request(`/v1/tools/${encodeURIComponent(slug)}/${call.path}${qs}`, {
        method: call.method,
        headers: {
          authorization: `Bearer ${key}`,
          accept: "application/json, text/plain;q=0.9, */*;q=0.5",
          ...(hasBody ? { "content-type": "application/json" } : {}),
        },
        body: hasBody ? JSON.stringify(call.input) : undefined,
      });
      const body = await res.text();
      const credits = res.headers.get("x-mrstockd-credits-remaining");
      const result: CallResult = {
        status: res.status,
        creditsRemaining: credits === null ? null : Number(credits),
        testKey: res.headers.get("x-mrstockd-test-key") === "true",
        contentType: res.headers.get("content-type") ?? "",
        body,
      };
      // Gateway refusals have a known shape; anything else is the seller's own response.
      if (!res.ok) {
        try {
          const parsed = JSON.parse(body) as { error?: { code?: string; message?: string } };
          if (parsed.error?.code && GATEWAY_ERROR_CODES.has(parsed.error.code)) {
            result.gatewayError = { code: parsed.error.code, message: parsed.error.message ?? "" };
          }
        } catch {
          // Not JSON: the seller's response.
        }
      }
      return result;
    },
  };
}

export type GatewayClient = ReturnType<typeof createGatewayClient>;
