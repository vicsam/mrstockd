import { RESET_LINK_MINUTES } from "@mrstockd/auth";
import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { SecurityPanel } from "@/components/auth/panels";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password · MrStockd", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  const valid = Boolean(token) && !error;
  return (
    <AuthLayout aside={<SecurityPanel resetMinutes={RESET_LINK_MINUTES} />}>
      {valid ? (
        <ResetPasswordForm token={token!} />
      ) : (
        <div className="flex flex-col gap-4">
          <h1 className="text-[clamp(28px,4vw,32px)] leading-[1.15] font-bold tracking-[-0.03em] text-[var(--l-ink)]">This link has expired</h1>
          <p className="text-[15px] leading-6 text-[var(--l-muted)]">
            Reset links work once and only for {RESET_LINK_MINUTES} minutes. Ask for a new one and use it straight away.
          </p>
          <a
            href="/forgot-password"
            className="mt-2 flex h-12 items-center justify-center rounded-[10px] bg-[#0d0c22] text-[15px] font-semibold text-white outline-none hover:bg-[#1f1d3a] focus-visible:ring-2 focus-visible:ring-[var(--l-violet)] focus-visible:ring-offset-2"
          >
            Send a new link
          </a>
        </div>
      )}
    </AuthLayout>
  );
}
