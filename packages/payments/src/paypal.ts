import { paypalApiBase } from "@mrstockd/core";

/**
 * Minimal PayPal REST client over fetch. No SDK: the surface is small
 * (OAuth, Orders v2, webhook signature verification) and a small, auditable
 * client that sends exactly the headers we want is worth more here.
 *
 * Points at the sandbox (api-m.sandbox.paypal.com) unless env is "live".
 * Create and capture calls forward the caller's PayPal-Request-Id so a
 * retried create or capture can never create or capture twice.
 */

export interface PayPalClientDeps {
  env: "sandbox" | "live";
  clientId: string;
  clientSecret: string;
  webhookId: string;
  /** Injectable for tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Injectable for tests. Milliseconds. */
  now?: () => number;
}

export interface PayPalOrderResult {
  id: string;
  status: string;
}

/** A capture inside a created/captured order (Payments v2 shape). */
export interface PayPalCapture {
  id: string;
  status: string;
  amount: { currency_code: string; value: string };
}

export interface PayPalCaptureResult extends PayPalOrderResult {
  purchase_units?: { payments?: { captures?: PayPalCapture[] } }[];
}

export interface WebhookVerificationInput {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
  /** The raw event as received, still unparsed by us. */
  event: unknown;
  webhookId?: string;
}

export interface VerificationResult {
  status: string;
}

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Parsed PayPal error body, e.g. { name: "ORDER_ALREADY_CAPTURED" }. */
    readonly details: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = "PayPalError";
  }
}

export interface CreateOrderInput {
  /** Sent as PayPal-Request-Id (from orders.paypalRequestId). */
  requestId: string;
  amount: string;
  currency: string;
  description?: string;
  customId?: string;
  returnUrl: string;
  cancelUrl: string;
  brandName?: string;
}

/** The first capture of a captured order, or null if there is none. */
export function firstCapture(result: PayPalCaptureResult | null | undefined): PayPalCapture | null {
  return result?.purchase_units?.[0]?.payments?.captures?.[0] ?? null;
}

/** Extracts a PayPal issue name ("ORDER_ALREADY_CAPTURED") from an error, if any. */
export function paypalIssue(error: unknown): string | null {
  if (error instanceof PayPalError) {
    const details = error.details ?? {};
    if (typeof details.name === "string") return details.name;
    const issues = Array.isArray(details.issues) ? details.issues : [];
    for (const issue of issues) {
      if (issue && typeof issue === "object" && typeof (issue as { issue?: unknown }).issue === "string") {
        return (issue as { issue: string }).issue;
      }
    }
  }
  return null;
}

export function createPayPal(deps: PayPalClientDeps) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const base = paypalApiBase(deps.env);
  const now = deps.now ?? (() => Date.now());
  /** Access token with a one-minute safety margin before its expiry. */
  let token: { value: string; expiresAt: number } | null = null;
  let tokenPromise: Promise<string> | null = null;

  async function accessToken(): Promise<string> {
    if (token && now() < token.expiresAt) return token.value;
    if (tokenPromise) return tokenPromise;
    // OAuth uses Basic auth, so credentials never appear in a query string.
    const basic = Buffer.from(`${deps.clientId}:${deps.clientSecret}`).toString("base64");
    tokenPromise = (async () => {
      const res = await fetchImpl(`${base}/v1/oauth2/token`, {
        method: "POST",
        headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "client_credentials" }),
      });
      const body = (await readJson(res)) as { access_token?: string; expires_in?: number };
      if (!res.ok || typeof body.access_token !== "string" || typeof body.expires_in !== "number") {
        throw new PayPalError(`PayPal OAuth token request failed with ${res.status}`, res.status, body as Record<string, unknown>);
      }
      token = { value: body.access_token, expiresAt: now() + body.expires_in * 1000 - 60_000 };
      return token.value;
    })();
    try {
      return await tokenPromise;
    } finally {
      tokenPromise = null;
    }
  }

  async function request(
    path: string,
    method: string,
    options: { requestId?: string; body?: unknown; retried?: boolean } = {},
  ): Promise<unknown> {
    const auth = `Bearer ${await accessToken()}`;
    const res = await fetchImpl(`${base}${path}`, {
      method,
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        ...(options.requestId ? { "PayPal-Request-Id": options.requestId } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const body = await readJson(res);
    if (res.ok) return body;
    // A stale token is retried once with a fresh one; everything else fails.
    if (res.status === 401 && !options.retried) {
      token = null;
      return request(path, method, { ...options, retried: true });
    }
    throw new PayPalError(`PayPal request to ${path} failed with ${res.status}`, res.status, body as Record<string, unknown>);
  }

  return {
    /** Everyone gets this id back so callers can show where the event came from. */
    get env(): "sandbox" | "live" {
      return deps.env;
    },

    /**
     * Creates an order for a fixed amount computed on our side. The intent is
     * always CAPTURE: money moves on the capture call, which we make on the
     * server after the buyer approves in the popup.
     */
    async createOrder(input: CreateOrderInput): Promise<PayPalOrderResult> {
      const body = {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: input.currency, value: input.amount },
            ...(input.description ? { description: input.description.slice(0, 127) } : {}),
            ...(input.customId ? { custom_id: input.customId } : {}),
          },
        ],
        application_context: {
          ...(input.brandName ? { brand_name: input.brandName.slice(0, 127) } : {}),
          return_url: input.returnUrl,
          cancel_url: input.cancelUrl,
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
        },
      };
      return (await request("/v2/checkout/orders", "POST", { requestId: input.requestId, body })) as PayPalOrderResult;
    },

    /** Captures an approved order. Same PayPal-Request-Id as create, so a retry can't capture twice. */
    async captureOrder(paypalOrderId: string, requestId: string): Promise<PayPalCaptureResult> {
      return (await request(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, "POST", { requestId })) as PayPalCaptureResult;
    },

    /** Reads an order's current state (captures included once it's captured). */
    async getOrder(paypalOrderId: string): Promise<PayPalOrderResult & PayPalCaptureResult> {
      return (await request(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, "GET")) as PayPalOrderResult & PayPalCaptureResult;
    },

    /** True only when PayPal verifies the headers and body against our webhook id. */
    async verifyWebhookSignature(input: WebhookVerificationInput): Promise<boolean> {
      const body = {
        auth_algo: input.authAlgo,
        cert_url: input.certUrl,
        transmission_id: input.transmissionId,
        transmission_sig: input.transmissionSig,
        transmission_time: input.transmissionTime,
        webhook_id: input.webhookId ?? deps.webhookId,
        webhook_event: input.event,
      };
      const result = (await request("/v1/notifications/verify-webhook-signature", "POST", { body })) as VerificationResult;
      return result.status === "SUCCESS";
    },
  };
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export type PayPalClient = ReturnType<typeof createPayPal>;
