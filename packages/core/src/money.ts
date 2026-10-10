/**
 * Money is always handled as integer minor units (cents) and always
 * computed on the server from database values. Never accept an amount
 * from the client or from an AI model.
 */

export type Cents = number & { readonly __brand: "Cents" };

export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid money amount: ${value}`);
  }
  return value as Cents;
}

/** Platform fee in basis points (1000 = 10%). */
export const PLATFORM_FEE_BPS = 1000;

export interface OrderTotals {
  subtotal: Cents;
  platformFee: Cents;
  sellerPayout: Cents;
}

/**
 * Computes an order from the listing's stored unit price and a quantity.
 * The unit price must come from the database, never from the request body.
 */
export function computeOrderTotals(unitPrice: Cents, quantity: number): OrderTotals {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) {
    throw new Error(`Invalid quantity: ${quantity}`);
  }
  const subtotal = cents(unitPrice * quantity);
  const platformFee = cents(Math.round((subtotal * PLATFORM_FEE_BPS) / 10_000));
  const sellerPayout = cents(subtotal - platformFee);
  return { subtotal, platformFee, sellerPayout };
}

/** Formats cents as a PayPal amount string, e.g. 1250 -> "12.50". */
export function toPayPalValue(amount: Cents): string {
  return (amount / 100).toFixed(2);
}
