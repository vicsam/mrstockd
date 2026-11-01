"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { getWaitlist } from "@/lib/waitlist";
import { earlyAccessEmail, sendEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(["hire", "build"], { message: "Choose whether you hire or build." }),
  name: z.string().trim().max(100).optional().transform((v) => (v ? v : undefined)),
  agentDescription: z.string().trim().max(500).optional().transform((v) => (v ? v : undefined)),
  agentLink: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || /^https?:\/\//i.test(v), "Enter a valid https link."),
  utmSource: z.string().trim().max(120).optional().transform((v) => (v ? v : undefined)),
  utmMedium: z.string().trim().max(120).optional().transform((v) => (v ? v : undefined)),
  utmCampaign: z.string().trim().max(120).optional().transform((v) => (v ? v : undefined)),
  website: z.string().max(0).optional(),
});

type FieldErrors = Partial<Record<string, string>>;

const rate = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const limit = 5;
  const entry = rate.get(ip);
  if (!entry || entry.resetAt < now) {
    rate.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= limit) return true;
  entry.count += 1;
  return false;
}

export async function joinEarlyAccess(raw: unknown): Promise<{ ok: boolean; message: string; errors?: FieldErrors }> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const errors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
    }
    return { ok: false, message: "Please fix the highlighted fields.", errors };
  }

  const data = parsed.data;
  // Honeypot: behave as success so bots don't learn.
  if (data.website) {
    return { ok: true, message: "You're on the list. We'll be in touch soon." };
  }

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return { ok: false, message: "Too many attempts. Try again later.", errors: { email: "Too many attempts. Try again later." } };
  }

  try {
    await getWaitlist().join({
      email: data.email,
      role: data.role,
      name: data.name ?? null,
      agentDescription: data.agentDescription ?? null,
      agentLink: data.agentLink ?? null,
      utmSource: data.utmSource ?? null,
      utmMedium: data.utmMedium ?? null,
      utmCampaign: data.utmCampaign ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not join the list.";
    return { ok: false, message: msg, errors: { email: msg } };
  }

  try {
    await sendEmail(earlyAccessEmail({ to: data.email, role: data.role }));
  } catch {
    // Signup succeeded; email failure is logged by the helper in dev.
  }

  return { ok: true, message: "You're on the list. We'll be in touch soon." };
}
