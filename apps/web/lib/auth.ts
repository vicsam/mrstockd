import { createAuth, type Auth } from "@mrstockd/auth";
import { parseEnv } from "@mrstockd/core";
import { createDb } from "@mrstockd/db";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { z } from "zod";

let instance: Auth | undefined;

/**
 * Server-side auth, created on first use so `next build` doesn't need
 * database credentials.
 */
export function getAuth(): Auth {
  if (instance) return instance;
  const env = parseEnv(
    z.object({
      NODE_ENV: z.string().default("development"),
      DATABASE_URL: z.string().min(1),
      BETTER_AUTH_SECRET: z.string().min(32),
      BETTER_AUTH_URL: z.url(),
    }),
  );
  instance = createAuth({
    db: createDb(env.DATABASE_URL),
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
