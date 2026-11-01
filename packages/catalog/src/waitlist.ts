import { and, type AnyDb, eq, sql, waitlistEntries } from "@mrstockd/db";
import { CatalogError } from "./errors.js";

export type WaitlistRole = "hire" | "build";

export interface WaitlistInput {
  email: string;
  role: WaitlistRole;
  name?: string | null;
  agentDescription?: string | null;
  agentLink?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  role: WaitlistRole;
  name: string | null;
  agentDescription: string | null;
  agentLink: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaitlistDeps {
  db: AnyDb;
  now?: () => Date;
}

export function createWaitlist(deps: WaitlistDeps) {
  const { db } = deps;
  const now = deps.now ?? (() => new Date());

  return {
    async join(input: WaitlistInput): Promise<"joined" | "already_listed"> {
      const email = input.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new CatalogError("validation", "Enter a valid email address.", { email: "Enter a valid email address." });
      }
      if (input.role !== "hire" && input.role !== "build") {
        throw new CatalogError("validation", "Choose whether you hire or build.", { role: "Pick one option." });
      }

      const trimmedLink = input.agentLink?.trim() || null;
      if (trimmedLink) {
        try {
          const u = new URL(trimmedLink);
          if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad");
        } catch {
          throw new CatalogError("validation", "Enter a valid https link.", { agentLink: "Enter a valid https link." });
        }
      }

      const inserted = await db
        .insert(waitlistEntries)
        .values({
          email,
          role: input.role,
          name: input.name?.trim() || null,
          agentDescription: input.agentDescription?.trim() || null,
          agentLink: trimmedLink,
          utmSource: input.utmSource?.trim() || null,
          utmMedium: input.utmMedium?.trim() || null,
          utmCampaign: input.utmCampaign?.trim() || null,
          updatedAt: now(),
        })
        .onConflictDoNothing({ target: waitlistEntries.email })
        .returning({ id: waitlistEntries.id });

      return inserted.length ? "joined" : "already_listed";
    },

    async list(): Promise<WaitlistEntry[]> {
      const rows = await db
        .select()
        .from(waitlistEntries)
        .orderBy(sql`${waitlistEntries.createdAt} desc`);
      return rows as WaitlistEntry[];
    },

    async counts(): Promise<{ hire: number; build: number; total: number }> {
      const rows = await db
        .select({ role: waitlistEntries.role, n: sql<number>`count(*)::int` })
        .from(waitlistEntries)
        .groupBy(waitlistEntries.role);
      const by = Object.fromEntries(rows.map((r) => [r.role, r.n]));
      const hire = by.hire ?? 0;
      const build = by.build ?? 0;
      return { hire, build, total: hire + build };
    },
  };
}
