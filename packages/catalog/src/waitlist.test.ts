import { createWaitlist } from "./waitlist.js";
import { createTestDb } from "@mrstockd/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let waitlist: ReturnType<typeof createWaitlist>;

beforeAll(async () => {
  testDb = await createTestDb();
  waitlist = createWaitlist({ db: testDb.db });
}, 60_000);

afterAll(async () => testDb?.close());

describe("waitlist", () => {
  it("joins a new email (lowercased) and lists it", async () => {
    const status = await waitlist.join({ email: "  Foo@Example.com ", role: "hire" });
    expect(status).toBe("joined");
    const rows = await waitlist.list();
    expect(rows.some((r) => r.email === "foo@example.com" && r.role === "hire")).toBe(true);
    const counts = await waitlist.counts();
    expect(counts.total).toBe(1);
    expect(counts.hire).toBe(1);
  });

  it("returns already_listed for a repeat email, without inserting a second row", async () => {
    await waitlist.join({ email: "foo@example.com", role: "build" });
    const rows = await waitlist.list();
    expect(rows.filter((r) => r.email === "foo@example.com")).toHaveLength(1);
  });

  it("stores builder details and utm fields", async () => {
    await waitlist.join({
      email: "builder@example.com",
      role: "build",
      name: "Ada",
      agentDescription: "Invoice extractor agent",
      agentLink: "https://example.com/agent",
      utmSource: "x",
      utmMedium: "y",
      utmCampaign: "z",
    });
    const row = (await waitlist.list()).find((r) => r.email === "builder@example.com")!;
    expect(row).toMatchObject({
      name: "Ada",
      agentDescription: "Invoice extractor agent",
      agentLink: "https://example.com/agent",
      utmSource: "x", utmMedium: "y", utmCampaign: "z",
    });
  });

  it("rejects malformed email", async () => {
    await expect(waitlist.join({ email: "not-an-email", role: "hire" })).rejects.toThrow();
  });
});
