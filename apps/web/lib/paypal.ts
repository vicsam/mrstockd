import { createPayPal, type PayPalClient } from "@mrstockd/payments";
import { serverEnv } from "./server-env";

let instance: PayPalClient | undefined;

/** Server-only PayPal REST client created from env. */
export function getPayPal(): PayPalClient {
  if (instance) return instance;
  const env = serverEnv();
  instance = createPayPal({
    env: env.PAYPAL_ENV,
    clientId: env.PAYPAL_CLIENT_ID,
    clientSecret: env.PAYPAL_CLIENT_SECRET,
    webhookId: env.PAYPAL_WEBHOOK_ID,
  });
  return instance;
}