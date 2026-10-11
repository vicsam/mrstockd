"use server";

import { MIN_INTERESTS, searchForTopics } from "@mrstockd/catalog";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getInterests } from "@/lib/catalog";

export type SaveInterestsState = { error: string | null };

/** Saves the picked topics, then opens the store filtered to them. */
export async function saveInterests(_prev: SaveInterestsState, form: FormData): Promise<SaveInterestsState> {
  const session = await requireSession();
  const topics = form.getAll("topic").map(String);
  let saved: string[];
  try {
    saved = await getInterests().save(session.user.id, topics);
  } catch {
    return { error: `Pick at least ${MIN_INTERESTS} topics, or skip for now.` };
  }
  const q = searchForTopics(saved);
  redirect(q ? `/tools?q=${encodeURIComponent(q)}` : "/tools");
}
