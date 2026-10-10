import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/form";
import { getSession } from "@/lib/auth";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create your account · MrStockd" };

export default async function SignUpPage() {
  if (await getSession()) redirect("/account");
  return (
    <AuthShell
      title="Create your account"
      subtitle="Buy AI tools for yourself, your team, or your agents."
      footer={
        <>
          Already have an account?{" "}
          <a href="/sign-in" className="font-medium text-current underline underline-offset-4">
            Sign in
          </a>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
