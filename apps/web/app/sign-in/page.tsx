import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/form";
import { getSession } from "@/lib/auth";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in · MrStockd" };

export default async function SignInPage() {
  if (await getSession()) redirect("/account");
  return (
    <AuthShell
      title="Welcome back"
      footer={
        <>
          New to MrStockd?{" "}
          <a href="/sign-up" className="font-medium text-current underline underline-offset-4">
            Create an account
          </a>
        </>
      }
    >
      <SignInForm />
    </AuthShell>
  );
}
