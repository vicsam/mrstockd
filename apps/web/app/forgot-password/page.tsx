import { RESET_LINK_MINUTES } from "@mrstockd/auth";
import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { SecurityPanel } from "@/components/auth/panels";
import { REPO_URL } from "@/components/landing/content";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset your password · MrStockd" };

const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL ? `mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}` : `${REPO_URL}/issues`;

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--l-brand)" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14a2 2 0 0 0 2 2h1v-5H6a2 2 0 0 0-2 2Zm16 0a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2Z" />
            </svg>
            Trouble getting into your account?
          </span>
          <a href={contact} className="font-semibold text-[var(--l-ink)] underline underline-offset-4">
            Contact support
          </a>
        </div>
      }
      aside={<SecurityPanel resetMinutes={RESET_LINK_MINUTES} />}
    >
      <a href="/sign-in" className="group mb-8 inline-flex min-h-11 w-fit items-center gap-2 text-[14px] font-semibold text-[var(--l-ink-2)] outline-none hover:text-[var(--l-ink)] focus-visible:text-[var(--l-ink)]">
        <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">
          ←
        </span>
        Back to sign in
      </a>
      <ForgotPasswordForm minutes={RESET_LINK_MINUTES} />
      <p className="mt-8 text-center text-[14px] text-[var(--l-muted)]">
        Remember your password?{" "}
        <a href="/sign-in" className="font-semibold text-[var(--l-ink)] underline-offset-4 outline-none hover:underline focus-visible:underline">
          Sign in
        </a>
      </p>
    </AuthLayout>
  );
}
