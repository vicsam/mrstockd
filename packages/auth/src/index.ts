import { type AnyDb, authSchema } from "@mrstockd/db";
import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins/organization";

export interface AuthOptions {
  db: AnyDb;
  /** At least 32 random bytes. Generate with: openssl rand -base64 32 */
  secret: string;
  /** Public URL of the web app, e.g. https://mrstockd.onrender.com */
  baseURL: string;
  /** Other origins allowed to call the auth API (for example the MCP server). */
  trustedOrigins?: string[];
  production?: boolean;
  /** Framework-specific plugins appended last (e.g. Next.js cookie handling). */
  extraPlugins?: BetterAuthPlugin[];
  /** Sign in with Google or Apple. Each is turned on only when its credentials are given. */
  social?: SocialProviders;
  /** Sends the "reset your password" email. Without it, password reset is unavailable. */
  sendResetPasswordEmail?: (message: { to: string; name: string; url: string }) => Promise<void>;
}

export interface SocialProviders {
  google?: { clientId: string; clientSecret: string };
  /** clientSecret is the signed JWT Apple issues for "Sign in with Apple" on the web. */
  apple?: { clientId: string; clientSecret: string };
}

/** Which social sign-in buttons to show, so the UI never offers one that isn't configured. */
export function enabledSocialProviders(social: SocialProviders | undefined): ("google" | "apple")[] {
  return (["google", "apple"] as const).filter((p) => Boolean(social?.[p]?.clientId && social[p]?.clientSecret));
}

import { RESET_LINK_MINUTES, SESSION_DAYS, PASSWORD_MIN_LENGTH } from "./constants.js";

export * from "./constants.js";

export function createAuth(options: AuthOptions) {
  if (options.secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters (openssl rand -base64 32).");
  }

  const social = enabledSocialProviders(options.social);
  const sendReset = options.sendResetPasswordEmail;

  return betterAuth({
    appName: "MrStockd",
    secret: options.secret,
    baseURL: options.baseURL,
    // Apple posts its sign-in response back from its own origin.
    trustedOrigins: [...(options.trustedOrigins ?? []), ...(social.includes("apple") ? ["https://appleid.apple.com"] : [])],
    database: drizzleAdapter(options.db, { provider: "pg", schema: authSchema }),

    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: 128,
      autoSignIn: true,
      // Email verification is switched on once transactional email (Resend) is wired.
      requireEmailVerification: false,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: RESET_LINK_MINUTES * 60,
      ...(sendReset
        ? {
            sendResetPassword: async ({ user, url }: { user: { email: string; name: string }; url: string }) => {
              await sendReset({ to: user.email, name: user.name, url });
            },
          }
        : {}),
    },

    socialProviders: Object.fromEntries(social.map((p) => [p, options.social![p]!])),

    session: {
      expiresIn: 60 * 60 * 24 * SESSION_DAYS,
      updateAge: 60 * 60 * 24, // refresh expiry at most once a day
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },

    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60 * 10, max: 5 },
        "/request-password-reset": { window: 60 * 10, max: 3 },
      },
    },

    advanced: {
      useSecureCookies: options.production ?? false,
      cookiePrefix: "mrstockd",
      // Better Auth turns these off by default when NODE_ENV=test. Setting them
      // explicitly keeps CSRF/origin protection identical in every environment.
      disableOriginCheck: false,
      disableCSRFCheck: false,
    },

    telemetry: { enabled: false },

    plugins: [
      // Teams: a business account with members who share tools, keys and spend limits.
      organization({
        allowUserToCreateOrganization: true,
        creatorRole: "owner",
        organizationLimit: 10,
      }),
      ...(options.extraPlugins ?? []),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
