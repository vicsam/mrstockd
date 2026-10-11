export type CatalogErrorCode =
  | "validation"
  | "not_found"
  | "not_a_seller"
  | "already_a_seller"
  | "invalid_transition"
  | "unsafe_endpoint";

/**
 * Expected, user-facing failures. Anything else thrown from the catalog is a
 * bug and should surface as a 500.
 */
export class CatalogError extends Error {
  constructor(
    readonly code: CatalogErrorCode,
    message: string,
    /** Per-field messages for forms, keyed by input name. */
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "CatalogError";
  }
}
