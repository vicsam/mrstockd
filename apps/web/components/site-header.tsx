import { getSession, isReviewer } from "@/lib/auth";

/** Top navigation for signed-in and signed-out visitors. */
export async function SiteHeader() {
  const session = await getSession();
  const links = [
    { href: "/tools", label: "Browse tools" },
    { href: "/sell", label: "Sell" },
    ...(isReviewer(session) ? [{ href: "/admin", label: "Admin" }] : []),
  ];
  return (
    <header className="border-b border-current/10">
      <nav aria-label="Main" className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4">
        <a href="/" className="mr-auto text-sm font-semibold tracking-wide text-stock uppercase sm:mr-0">
          MrStockd
        </a>
        <ul className="order-last flex w-full flex-wrap items-center gap-x-5 gap-y-1 text-sm sm:order-none sm:w-auto sm:flex-1">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <a href={session ? "/account" : "/sign-in"} className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline">
          {session ? "Account" : "Sign in"}
        </a>
      </nav>
    </header>
  );
}
