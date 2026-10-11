import { serverEnv } from "./server-env";

type Email = { to: string; subject: string; text: string; html: string };

/**
 * Sends a transactional email through Resend. Without RESEND_API_KEY it
 * prints the email to the server log in development (so password reset can
 * be tested locally) and refuses in production, rather than pretending.
 */
export async function sendEmail(email: Email): Promise<void> {
  const env = serverEnv();
  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV === "production") throw new Error("Email is not configured: set RESEND_API_KEY.");
    console.info(`\n[email] To: ${email.to}\n[email] Subject: ${email.subject}\n${email.text}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend refused the email (${res.status})`);
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function resetPasswordEmail({ to, name, url, minutes }: { to: string; name: string; url: string; minutes: number }): Email {
  const first = name.trim().split(/\s+/)[0] || "there";
  return {
    to,
    subject: "Reset your MrStockd password",
    text: `Hi ${first},\n\nUse this link to choose a new password. It works once and expires in ${minutes} minutes:\n${url}\n\nIf you didn't ask for this, you can ignore this email. Your password stays the same.\n\nMrStockd`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;color:#0d0c22">
<p>Hi ${escape(first)},</p>
<p>Use the button below to choose a new password. It works once and expires in ${minutes} minutes.</p>
<p><a href="${escape(url)}" style="display:inline-block;background:#0d0c22;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Choose a new password</a></p>
<p style="color:#646b78;font-size:14px">If you didn't ask for this, you can ignore this email. Your password stays the same.</p>
</div>`,
  };
}
