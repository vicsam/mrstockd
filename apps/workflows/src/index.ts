/**
 * Durable background jobs, deployed as a Render Workflows service.
 *
 * Planned tasks:
 *   - vetListing:      SSRF-check the endpoint, run a test call, AI-score
 *                      the listing, queue it for human approval
 *   - provisionAccess: after a verified PayPal webhook, issue the API key
 *                      and credits, email the buyer
 *   - settleSeller:    pay the seller (multiparty, or Payouts fallback)
 *
 * Task definitions are added with the Render SDK (@renderinc/sdk) once the
 * week-1 PayPal sandbox spike confirms the payout path.
 */
export const plannedTasks = ["vetListing", "provisionAccess", "settleSeller"] as const;
