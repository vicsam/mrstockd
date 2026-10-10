import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, getSession } from "@/lib/auth";
import { CreateTeamForm, SignOutButton } from "./account-actions";

export const metadata: Metadata = { title: "Your account · MrStockd" };

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const teams = await getAuth().api.listOrganizations({ headers: await headers() });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-12 px-4 py-12">
      <header className="flex items-center justify-between gap-4">
        <a href="/" className="text-sm font-semibold tracking-wide text-stock uppercase">
          MrStockd
        </a>
        <SignOutButton />
      </header>

      <section aria-labelledby="profile-heading">
        <h1 id="profile-heading" className="text-3xl font-semibold tracking-tight">
          Hi, {session.user.name.split(" ")[0]}
        </h1>
        <p className="mt-2 text-muted">Signed in as {session.user.email}</p>
      </section>

      <section aria-labelledby="teams-heading" className="flex flex-col gap-6">
        <div>
          <h2 id="teams-heading" className="text-xl font-semibold">
            Teams
          </h2>
          <p className="mt-1 text-sm text-muted">
            A team shares tools, API keys and agent spending limits across its members.
          </p>
        </div>

        {teams.length > 0 ? (
          <ul className="flex flex-col divide-y divide-current/10 rounded-xl border border-current/15">
            {teams.map((team) => (
              <li key={team.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="font-medium">{team.name}</span>
                <span className="font-mono text-xs text-muted">{team.slug}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-current/20 px-4 py-6 text-center text-sm text-muted">
            You&apos;re not in a team yet. Create one to buy tools for your business.
          </p>
        )}

        <CreateTeamForm />
      </section>
    </main>
  );
}
