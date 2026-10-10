import { z } from "zod";

/**
 * Parses environment variables once at startup and fails fast with a
 * readable message if anything is missing.
 */
export function parseEnv<T extends z.ZodType>(schema: T, source: NodeJS.ProcessEnv = process.env): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return result.data;
}

export const paypalEnvSchema = z.object({
  PAYPAL_ENV: z.enum(["sandbox", "live"]).default("sandbox"),
  PAYPAL_CLIENT_ID: z.string().min(1),
  PAYPAL_CLIENT_SECRET: z.string().min(1),
  PAYPAL_WEBHOOK_ID: z.string().min(1),
});

export function paypalApiBase(env: "sandbox" | "live"): string {
  return env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}
