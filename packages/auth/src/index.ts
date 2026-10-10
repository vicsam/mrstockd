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
}

export const PASSWORD_MIN_LENGTH = 10;

export function createAuth(options: AuthOptions) {
  if (options.secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters (openssl rand -base64 32).");
  }

  return betterAuth({
    appName: "MrStockd",
    secret: options.secret,
    baseURL: options.baseURL,
    trustedOrigins: options.trustedOrigins ?? [],
    database: drizzleAdapter(options.db, { provider: "pg", schema: authSchema }),

    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: 128,
      autoSignIn: true,
      // Email verification is switched on once transactional email (Resend) is wired.
      requireEmailVerification: false,
      revokeSessionsOnPasswordReset: true,
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
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
