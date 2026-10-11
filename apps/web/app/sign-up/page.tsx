import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFooter, AuthLayout } from "@/components/auth/auth-layout";
import { SignUpPanel } from "@/components/auth/panels";
import { getSession, socialSignInOptions } from "@/lib/auth";
import { gatewayStatus, newestTools } from "@/lib/marketplace";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create your account · MrStockd" };

export default async function SignUpPage() {
  if (await getSession()) redirect("/account");
  const [{ tools }, status] = await Promise.all([newestTools(3), gatewayStatus()]);

  return (
    <AuthLayout
      topRight={
        <a href="/tools" className="inline-flex min-h-11 items-center gap-2 text-[13px] font-medium text-[var(--l-muted)] outline-none hover:text-[var(--l-ink)] focus-visible:text-[var(--l-ink)]">
          Browse the store
          <span className="rounded-full border border-[rgba(26,25,48,0.1)] bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--l-ink-2)]">no account needed</span>
        </a>
      }
      footer={<AuthFooter status={status} />}
      aside={<SignUpPanel tools={tools} />}
    >
      <h1 className="text-[clamp(28px,4vw,32px)] leading-[1.15] font-bold tracking-[-0.03em] text-[var(--l-ink)]">Create your account</h1>
      <p className="mt-2 text-[15px] leading-6 text-[var(--l-muted)]">Buy reviewed AI tools for you, your team or your agents, or sell the ones you build.</p>
      <div className="mt-8">
        <SignUpForm providers={socialSignInOptions()} />
      </div>
      <p className="mt-8 border-t border-[rgba(26,25,48,0.08)] pt-6 text-center text-[14px] text-[var(--l-muted)]">
        Already have an account?{" "}
        <a href="/sign-in" className="font-semibold text-[var(--l-brand-text)] underline-offset-4 outline-none hover:underline focus-visible:underline">
          Sign in
        </a>
      </p>
    </AuthLayout>
  );
}
