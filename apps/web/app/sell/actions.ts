"use server";

import { CatalogError, type ListingInput } from "@mrstockd/catalog";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession, isReviewer } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";

export interface ActionState {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** What the user typed, so the form can be refilled after an error. Never includes secrets. */
  values?: Record<string, string>;
  /** A newly issued test key. Sent to the browser once and never stored in plain text. */
  testKey?: string;
}

const LISTING_FIELDS = ["name", "summary", "description", "endpointUrl", "pricingModel", "price", "creditsPerUnit"] as const;

function readListing(form: FormData): { input: ListingInput; values: Record<string, string> } {
  const values: Record<string, string> = {};
  for (const field of LISTING_FIELDS) values[field] = String(form.get(field) ?? "");
  return {
    values,
    input: {
      name: values.name!,
      summary: values.summary!,
      description: values.description!,
      endpointUrl: values.endpointUrl!,
      pricingModel: values.pricingModel as ListingInput["pricingModel"],
      price: values.price!,
      creditsPerUnit: values.creditsPerUnit || "1",
      upstreamSecret: String(form.get("upstreamSecret") ?? ""),
    },
  };
}

/** Expected failures become form state; anything else is a real error. */
function toState(error: unknown, values?: Record<string, string>): ActionState {
  if (error instanceof CatalogError) return { error: error.message, fieldErrors: error.fieldErrors, values };
  throw error;
}

async function signedInUserId(): Promise<string> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session.user.id;
}

export async function becomeSellerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ownerId = await signedInUserId();
  const displayName = String(form.get("displayName") ?? "");
  try {
    await getCatalog().becomeSeller(ownerId, { displayName });
  } catch (error) {
    if (!(error instanceof CatalogError && error.code === "already_a_seller")) return toState(error, { displayName });
  }
  revalidatePath("/sell");
  redirect("/sell");
}

export async function createListingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ownerId = await signedInUserId();
  const { input, values } = readListing(form);
  let id: string;
  try {
    id = (await getCatalog().createListing(ownerId, input)).id;
  } catch (error) {
    return toState(error, values);
  }
  revalidatePath("/sell");
  redirect(`/sell/listings/${id}?created=1`);
}

export async function updateListingAction(listingId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ownerId = await signedInUserId();
  const { input, values } = readListing(form);
  try {
    const before = await getCatalog().getMyListing(ownerId, listingId);
    const after = await getCatalog().updateListing(ownerId, listingId, input);
    revalidatePath("/sell");
    revalidatePath(`/sell/listings/${listingId}`);
    revalidatePath(`/tools/${after.slug}`);
    const backToReview = after.status === "in_review" && before.status !== "in_review";
    return {
      ok: true,
      values,
      message: backToReview
        ? "Saved. Because the endpoint or secret changed, this tool is back in review and hidden from the store until it's approved."
        : "Changes saved.",
    };
  } catch (error) {
    return toState(error, values);
  }
}

export async function listingStatusAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ownerId = await signedInUserId();
  const listingId = String(form.get("listingId") ?? "");
  const action = String(form.get("action") ?? "");
  if (!["submit", "withdraw", "pause", "resume"].includes(action)) return { error: "Unknown action." };
  try {
    const listing = await getCatalog().changeMyListingStatus(ownerId, listingId, action as "submit" | "withdraw" | "pause" | "resume");
    revalidatePath("/sell");
    revalidatePath(`/sell/listings/${listingId}`);
    revalidatePath(`/tools/${listing.slug}`);
    const messages: Record<string, string> = {
      submit: "Submitted for review. You'll see the result here.",
      withdraw: "Withdrawn. It's a draft again.",
      pause: "Paused. Buyers can't see or call it until you resume.",
      resume: "Live again.",
    };
    return { ok: true, message: messages[action] };
  } catch (error) {
    return toState(error);
  }
}

export async function reviewAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  // Re-checked on every action: hiding the page is not enough.
  if (!isReviewer(session)) return { error: "You don't have permission to review listings." };
  const listingId = String(form.get("listingId") ?? "");
  const decision = String(form.get("decision") ?? "");
  if (decision !== "approve" && decision !== "reject") return { error: "Unknown decision." };
  const note = String(form.get("note") ?? "");
  let reviewed: { name: string };
  try {
    reviewed = await getCatalog().review(session.user.id, listingId, decision, note);
  } catch (error) {
    return toState(error, { note });
  }
  revalidatePath("/tools");
  // The confirmation lives on the queue page itself, so it survives the
  // reviewed item leaving the queue.
  redirect(`/admin/review?${new URLSearchParams({ done: decision, tool: reviewed.name })}`);
}

/** Creates (or replaces) the seller's test key for their own tool, or stops it. */
export async function testKeyAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ownerId = await signedInUserId();
  const listingId = String(form.get("listingId") ?? "");
  const intent = String(form.get("intent") ?? "");
  try {
    if (intent === "create") {
      const issued = await getCatalog().issueTestKey(ownerId, listingId);
      revalidatePath(`/sell/listings/${listingId}`);
      return { ok: true, testKey: issued.key, message: "Test key created. Copy it now: it won't be shown again." };
    }
    if (intent === "revoke") {
      await getCatalog().revokeTestKey(ownerId, listingId);
      revalidatePath(`/sell/listings/${listingId}`);
      return { ok: true, message: "Test key stopped. Calls with it are now refused." };
    }
    return { error: "Unknown action." };
  } catch (error) {
    return toState(error);
  }
}
