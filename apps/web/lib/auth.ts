import { createAuth, type Auth } from "@mrstockd/auth";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, serverEnv } from "./server-env";

let instance: Auth | undefined;

/**
 * Server-side auth, created on first use so `next build` doesn't need
 * database credentials.
 */
export function getAuth(): Auth {
  if (instance) return instance;
  const env = serverEnv();
  instance = createAuth({
    db: getDb(),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    production: env.NODE_ENV === "production",
    extraPlugins: [nextCookies()],
  });
  return instance;
}

/** The signed-in user's session for the current request, or null. */
export async function getSession() {
  // Read headers first: it marks the page as per-request, so Next.js never
  // tries to prerender it (and touch the database) at build time.
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders });
}

export type SessionData = NonNullable<Awaited<ReturnType<typeof getSession>>>;

/** For pages that need a signed-in user: sends everyone else to sign-in. */
export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

/** Reviewers are listed by email in ADMIN_EMAILS. */
export function isReviewer(session: SessionData | null): boolean {
  if (!session) return false;
  const allowed = serverEnv()
    .ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(session.user.email.toLowerCase());
}
