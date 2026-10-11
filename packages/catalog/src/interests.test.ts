import { createTestDb } from "@mrstockd/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanTopics, createInterests, searchForTopics } from "./index.js";

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let interests: ReturnType<typeof createInterests>;

beforeAll(async () => {
  testDb = await createTestDb();
  interests = createInterests({ db: testDb.db });
}, 60_000);

afterAll(async () => testDb?.close());

describe("onboarding interests", () => {
  it("drops unknown and repeated topics", () => {
    expect(cleanTopics(["support", "nope", "support", "sql"])).toEqual(["support", "sql"]);
  });

  it("builds one store search from the picked topics", () => {
    expect(searchForTopics(["support", "sql"])).toBe("customer support tickets helpdesk database sql migration");
    expect(searchForTopics(["<script>"])).toBe("");
  });

  it("needs at least three topics", async () => {
    await expect(interests.save("u1", ["support", "sql"])).rejects.toThrow(/at least 3/);
    await expect(interests.save("u1", ["support", "sql", "made-up"])).rejects.toThrow(/at least 3/);
  });

  it("saves, reads back and replaces a user's topics", async () => {
    expect(await interests.get("u2")).toEqual([]);
    await interests.save("u2", ["support", "devops", "data"]);
    expect(await interests.get("u2")).toEqual(["support", "devops", "data"]);
    await interests.save("u2", ["legal", "qa", "seo", "legal"]);
    expect(await interests.get("u2")).toEqual(["legal", "qa", "seo"]);
  });
});
