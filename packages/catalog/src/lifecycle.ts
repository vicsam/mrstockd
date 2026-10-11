export type ListingStatus = "draft" | "in_review" | "live" | "rejected" | "paused";

/**
 * Who may move a listing between which states.
 *
 *   draft ──submit──▶ in_review ──approve──▶ live ◀──resume── paused
 *     ▲                 │    │                 └────pause─────▲
 *     └────withdraw─────┘    └──reject──▶ rejected ──resubmit──▶ in_review
 *
 * Sellers can never make their own listing live; only a reviewer can.
 * Changing a live listing's endpoint or secret sends it back to in_review
 * (see the catalog's update rules).
 */
export type ListingAction = "submit" | "withdraw" | "pause" | "resume" | "approve" | "reject";

const SELLER_TRANSITIONS: Record<string, { from: ListingStatus[]; to: ListingStatus }> = {
  submit: { from: ["draft", "rejected"], to: "in_review" },
  withdraw: { from: ["in_review"], to: "draft" },
  pause: { from: ["live"], to: "paused" },
  resume: { from: ["paused"], to: "live" },
};

const REVIEWER_TRANSITIONS: Record<string, { from: ListingStatus[]; to: ListingStatus }> = {
  approve: { from: ["in_review"], to: "live" },
  reject: { from: ["in_review"], to: "rejected" },
};

export function nextStatus(action: ListingAction, from: ListingStatus, actor: "seller" | "reviewer"): ListingStatus | null {
  const rule = (actor === "seller" ? SELLER_TRANSITIONS : REVIEWER_TRANSITIONS)[action];
  return rule && rule.from.includes(from) ? rule.to : null;
}

/** Statuses whose listings buyers can see and call. */
export const PUBLIC_STATUSES: ListingStatus[] = ["live"];
