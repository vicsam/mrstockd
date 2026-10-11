import { z } from "zod";
import { CatalogError } from "./errors.js";

export const PRICE_MIN_CENTS = 50; // $0.50, below which PayPal fees eat the sale
export const PRICE_MAX_CENTS = 100_000; // $1,000

/** "4.99" or "4" → 499. Rejects fractions of a cent and anything that isn't a plain amount. */
export function parsePriceToCents(input: string): number | null {
  const trimmed = input.trim().replace(/^\$/, "");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export const sellerInputSchema = z.object({
  displayName: z.string().trim().min(2, "Use at least 2 characters.").max(60, "Use 60 characters or fewer."),
});
export type SellerInput = z.input<typeof sellerInputSchema>;

const price = z
  .string()
  .transform((value, ctx) => {
    const cents = parsePriceToCents(value);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Enter a price like 4.99." });
      return z.NEVER;
    }
    if (cents < PRICE_MIN_CENTS || cents > PRICE_MAX_CENTS) {
      ctx.addIssue({ code: "custom", message: "Price must be between $0.50 and $1,000." });
      return z.NEVER;
    }
    return cents;
  });

export const listingInputSchema = z
  .object({
    name: z.string().trim().min(3, "Use at least 3 characters.").max(80, "Use 80 characters or fewer."),
    summary: z.string().trim().min(10, "Describe it in at least 10 characters.").max(160, "Keep the summary to 160 characters."),
    description: z.string().trim().min(20, "Use at least 20 characters.").max(5000, "Keep it under 5,000 characters."),
    endpointUrl: z.string().trim().min(1, "Enter your tool's URL.").max(2048, "That URL is too long."),
    pricingModel: z.enum(["credits", "subscription"], { message: "Choose credit packs or a monthly plan." }),
    price,
    /** Calls included in one credit pack. Ignored for subscriptions. */
    creditsPerUnit: z.coerce
      .number({ message: "Enter a whole number." })
      .int("Enter a whole number.")
      .min(1, "A pack must include at least 1 call.")
      .max(1_000_000, "That's more calls than a pack can hold.")
      .default(1),
    /** Write-only. Empty or missing means "keep the current secret". */
    upstreamSecret: z.string().max(2048, "That secret is too long.").optional(),
  });
export type ListingInput = z.input<typeof listingInputSchema>;
export type ParsedListingInput = z.output<typeof listingInputSchema>;

export function parseOrThrow<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  throw new CatalogError("validation", "Some fields need attention.", fieldErrors);
}
