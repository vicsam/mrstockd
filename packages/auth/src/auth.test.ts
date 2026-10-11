import { accounts, eq, members, users } from "@mrstockd/db";
import { createTestDb } from "@mrstockd/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuth, enabledSocialProviders } from "./index.js";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let auth: ReturnType<typeof createAuth>;
const sentResets: { to: string; url: string }[] = [];
const BASE = "http://localhost:3000";

beforeAll(async () => {
  testDb = await createTestDb();
  auth = createAuth({
    db: testDb.db,
    secret: "test-secret-that-is-at-least-32-characters",
    baseURL: BASE,
    sendResetPasswordEmail: async (m) => {
      sentResets.push(m);
    },
  });
}, 60_000);

afterAll(async () => testDb?.close());

/** Calls the auth HTTP handler the way a browser would. */
function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return auth.handler(
    new Request(`${BASE}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE, "x-forwarded-for": "203.0.113.7", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

function sessionCookie(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

describe("email and password accounts", () => {
  it("signs up, stores only a password hash, and starts a session", async () => {
    const res = await post("/sign-up/email", { name: "Ada Buyer", email: "ada@example.com", password: "correct-horse-battery" });
    expect(res.status).toBe(200);

    const cookie = sessionCookie(res);
    expect(cookie).toContain("mrstockd.session_token");

    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(session?.user.email).toBe("ada@example.com");

    const [user] = await testDb.db.select().from(users).where(eq(users.email, "ada@example.com"));
    const [account] = await testDb.db.select().from(accounts).where(eq(accounts.userId, user!.id));
    expect(account!.password).toBeTruthy();
    expect(account!.password).not.toContain("correct-horse-battery");
  });

  it("rejects short passwords and duplicate emails", async () => {
    expect((await post("/sign-up/email", { name: "X", email: "short@example.com", password: "short" })).status).toBe(400);
    const dup = await post("/sign-up/email", { name: "Ada Again", email: "ada@example.com", password: "another-long-password" });
    expect(dup.status).toBeGreaterThanOrEqual(400);
  });

  it("signs in with the right password only", async () => {
    expect((await post("/sign-in/email", { email: "ada@example.com", password: "correct-horse-battery" }, { "x-forwarded-for": "198.51.100.1" })).status).toBe(200);
    expect((await post("/sign-in/email", { email: "ada@example.com", password: "wrong-password-123" }, { "x-forwarded-for": "198.51.100.1" })).status).toBe(401);
  });

  it("rate-limits repeated sign-in attempts from one address", async () => {
    const attempt = () => post("/sign-in/email", { email: "ada@example.com", password: "guess-number-0000" }, { "x-forwarded-for": "192.0.2.50" });
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await attempt()).status);
    expect(statuses).toContain(429);
  });

  it("blocks cross-site requests that ride on a victim's session (CSRF)", async () => {
    const signIn = await post("/sign-in/email", { email: "ada@example.com", password: "correct-horse-battery" }, { "x-forwarded-for": "198.51.100.9" });
    const cookie = sessionCookie(signIn);
    const forged = await post("/organization/create", { name: "Evil Corp", slug: "evil-corp" }, { cookie, origin: "https://evil.example", "x-forwarded-for": "198.51.100.9" });
    expect(forged.status).toBe(403);
    const legit = await post("/organization/create", { name: "Ada Co", slug: "ada-co" }, { cookie, "x-forwarded-for": "198.51.100.9" });
    expect(legit.status).toBe(200);
  });
});

describe("remember me", () => {
  it("keeps the session for 30 days when ticked, and only for the browser session when not", async () => {
    await post("/sign-up/email", { name: "Rem Ember", email: "rem@example.com", password: "remember-me-please" }, { "x-forwarded-for": "198.51.100.20" });
    const kept = await post("/sign-in/email", { email: "rem@example.com", password: "remember-me-please", rememberMe: true }, { "x-forwarded-for": "198.51.100.21" });
    const keptCookie = kept.headers.getSetCookie().find((c) => c.startsWith("mrstockd.session_token"))!;
    expect(keptCookie).toMatch(/Max-Age=2592000/);
    const brief = await post("/sign-in/email", { email: "rem@example.com", password: "remember-me-please", rememberMe: false }, { "x-forwarded-for": "198.51.100.22" });
    const briefCookie = brief.headers.getSetCookie().find((c) => c.startsWith("mrstockd.session_token"))!;
    expect(briefCookie).not.toMatch(/Max-Age/);
  });
});

describe("password reset", () => {
  it("emails a one-time link that sets a new password and signs out old sessions", async () => {
    await post("/sign-up/email", { name: "Res Et", email: "reset@example.com", password: "old-password-123" }, { "x-forwarded-for": "198.51.100.30" });
    const ask = await post("/request-password-reset", { email: "reset@example.com", redirectTo: "/reset-password" }, { "x-forwarded-for": "198.51.100.31" });
    expect(ask.status).toBe(200);
    const mail = sentResets.find((m) => m.to === "reset@example.com")!;
    expect(mail.url).toContain("/api/auth/reset-password/");

    // Following the link redirects to our page with the token.
    const follow = await auth.handler(new Request(mail.url));
    const location = new URL(follow.headers.get("location")!, BASE);
    expect(location.pathname).toBe("/reset-password");
    const token = location.searchParams.get("token")!;

    expect((await post("/reset-password", { token, newPassword: "brand-new-password" }, { "x-forwarded-for": "198.51.100.32" })).status).toBe(200);
    expect((await post("/reset-password", { token, newPassword: "second-try-password" }, { "x-forwarded-for": "198.51.100.33" })).status).toBe(400);
    expect((await post("/sign-in/email", { email: "reset@example.com", password: "brand-new-password" }, { "x-forwarded-for": "198.51.100.34" })).status).toBe(200);
    expect((await post("/sign-in/email", { email: "reset@example.com", password: "old-password-123" }, { "x-forwarded-for": "198.51.100.35" })).status).toBe(401);
  });

  it("answers the same way for unknown emails, so accounts can't be discovered", async () => {
    const before = sentResets.length;
    const res = await post("/request-password-reset", { email: "nobody@example.com", redirectTo: "/reset-password" }, { "x-forwarded-for": "198.51.100.40" });
    expect(res.status).toBe(200);
    expect(sentResets.length).toBe(before);
  });
});

describe("social sign-in", () => {
  it("only turns on providers that have both an id and a secret", () => {
    expect(enabledSocialProviders(undefined)).toEqual([]);
    expect(enabledSocialProviders({ google: { clientId: "id", clientSecret: "" } })).toEqual([]);
    expect(enabledSocialProviders({ google: { clientId: "id", clientSecret: "s" }, apple: { clientId: "a", clientSecret: "b" } })).toEqual(["google", "apple"]);
  });
});

describe("teams (organizations)", () => {
  it("lets a signed-in user create a team and makes them its owner", async () => {
    const signUp = await post("/sign-up/email", { name: "Lagos Labs Admin", email: "admin@lagoslabs.dev", password: "team-owner-password" });
    const headers = new Headers({ cookie: sessionCookie(signUp) });

    const org = await auth.api.createOrganization({ body: { name: "Lagos Labs", slug: "lagos-labs" }, headers });
    expect(org?.slug).toBe("lagos-labs");

    const [membership] = await testDb.db.select().from(members).where(eq(members.organizationId, org!.id));
    expect(membership?.role).toBe("owner");
  });

  it("refuses to create a team without a session", async () => {
    await expect(auth.api.createOrganization({ body: { name: "Nope", slug: "nope" }, headers: new Headers() })).rejects.toThrow();
  });
});
