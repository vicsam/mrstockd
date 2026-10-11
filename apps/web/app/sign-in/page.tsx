import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFooter, AuthLayout } from "@/components/auth/auth-layout";
import { SignInPanel } from "@/components/auth/panels";
import { getSession, socialSignInOptions } from "@/lib/auth";
import { gatewayStatus, newestTools } from "@/lib/marketplace";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in · MrStockd" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ reset?: string; error?: string }> }) {
  if (await getSession()) redirect("/account");
  const [{ reset, error }, { tools, total }, status] = await Promise.all([searchParams, newestTools(3), gatewayStatus()]);

  return (
    <AuthLayout
      topRight={
        <a href="/#faq" className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-[var(--l-muted)] outline-none hover:text-[var(--l-ink)] focus-visible:text-[var(--l-ink)]">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6v.3M12 17h.01" />
          </svg>
          Help
        </a>
      }
      footer={<AuthFooter status={status} />}
      aside={<SignInPanel tools={tools} total={total} />}
    >
      <h1 className="text-[clamp(28px,4vw,32px)] leading-[1.15] font-bold tracking-[-0.03em] text-[var(--l-ink)]">Sign in to your account</h1>
      <p className="mt-2 text-[15px] leading-6 text-[var(--l-muted)]">Welcome back. Your tools, API keys and sales are where you left them.</p>
      <div className="mt-8">
        <SignInForm
          providers={socialSignInOptions()}
          notice={reset === "done" ? "Your password was changed. Sign in with the new one." : null}
          socialError={error ? "Sign-in with that provider didn't work. Try again, or use your email." : null}
        />
      </div>
      <p className="mt-8 text-center text-[14px] text-[var(--l-muted)]">
        Don&apos;t have an account?{" "}
        <a href="/sign-up" className="font-semibold text-[var(--l-ink)] underline-offset-4 outline-none hover:underline focus-visible:underline">
          Sign up
        </a>
      </p>
    </AuthLayout>
  );
}
