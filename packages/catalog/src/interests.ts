import { type AnyDb, eq, sql, userInterests } from "@mrstockd/db";

/**
 * The jobs people can pick during onboarding ("What do you want to automate?").
 * `search` is the plain-words query used to find matching tools in the store.
 */
export const INTEREST_TOPICS = [
  { id: "support", label: "Customer Support & Ticketing", search: "customer support tickets helpdesk" },
  { id: "devops", label: "Code Review & DevOps", search: "code review devops deploy" },
  { id: "data", label: "Data Extraction & ETL", search: "data extraction etl scraping" },
  { id: "sales", label: "Outbound Sales SDR", search: "sales leads outreach" },
  { id: "market", label: "Market & Competitor Intelligence", search: "market research competitor" },
  { id: "finance", label: "Financial Reconciliation", search: "finance reconciliation invoice accounting" },
  { id: "security", label: "Security & Vulnerability Auditing", search: "security vulnerability audit" },
  { id: "legal", label: "Legal Document Analysis", search: "legal contract document" },
  { id: "writing", label: "Content & Technical Writing", search: "writing content copy documentation" },
  { id: "qa", label: "Automated QA Testing", search: "qa testing tests" },
  { id: "seo", label: "SEO & Growth Experiments", search: "seo growth marketing" },
  { id: "sql", label: "Database Migration & SQL", search: "database sql migration" },
] as const;

export type InterestTopicId = (typeof INTEREST_TOPICS)[number]["id"];
export const MIN_INTERESTS = 3;

const known = new Set<string>(INTEREST_TOPICS.map((t) => t.id));

/** Keeps only known topic ids, once each, in the order given. */
export function cleanTopics(input: readonly string[]): InterestTopicId[] {
  return [...new Set(input.filter((t) => known.has(t)))] as InterestTopicId[];
}

/** One store search that covers every picked topic (search matches any word). */
export function searchForTopics(topics: readonly string[]): string {
  const picked = new Set(cleanTopics(topics));
  return INTEREST_TOPICS.filter((t) => picked.has(t.id))
    .map((t) => t.search)
    .join(" ");
}

export function createInterests({ db }: { db: AnyDb }) {
  return {
    async get(userId: string): Promise<InterestTopicId[]> {
      const [row] = await db.select({ topics: userInterests.topics }).from(userInterests).where(eq(userInterests.userId, userId));
      return row ? cleanTopics(row.topics) : [];
    },

    /** Saves the picked topics. Needs at least MIN_INTERESTS known topics. */
    async save(userId: string, topics: readonly string[]): Promise<InterestTopicId[]> {
      const clean = cleanTopics(topics);
      if (clean.length < MIN_INTERESTS) throw new Error(`Pick at least ${MIN_INTERESTS} topics.`);
      await db
        .insert(userInterests)
        .values({ userId, topics: clean })
        .onConflictDoUpdate({ target: userInterests.userId, set: { topics: clean, updatedAt: sql`now()` } });
      return clean;
    },
  };
}

export type Interests = ReturnType<typeof createInterests>;
