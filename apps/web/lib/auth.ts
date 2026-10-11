import { createAuth, enabledSocialProviders, RESET_LINK_MINUTES, type Auth, type SocialProviders } from "@mrstockd/auth";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resetPasswordEmail, sendEmail } from "./email";
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
    social: socialConfig(),
    sendResetPasswordEmail: async ({ to, name, url }) => sendEmail(resetPasswordEmail({ to, name, url, minutes: RESET_LINK_MINUTES })),
  });
  return instance;
}

function socialConfig(): SocialProviders {
  const env = serverEnv();
  return {
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
    apple: { clientId: env.APPLE_CLIENT_ID, clientSecret: env.APPLE_CLIENT_SECRET },
  };
}

/** Social sign-in buttons to show. Empty when none are configured, or env can't be read at build time. */
export function socialSignInOptions(): ("google" | "apple")[] {
  try {
    return enabledSocialProviders(socialConfig());
  } catch {
    return [];
  }
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
