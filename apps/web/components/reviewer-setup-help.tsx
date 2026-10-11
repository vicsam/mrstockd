/** Shown in development to signed-in non-reviewers, instead of a dead-end 404. */
export function ReviewerSetupHelp({ email }: { email: string }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">You&apos;re not a reviewer yet</h1>
      <p className="text-muted">
        Reviewers are the emails listed in <code className="font-mono">ADMIN_EMAILS</code>. You&apos;re signed in as{" "}
        <strong className="text-current">{email}</strong>.
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>
          Open the <code className="font-mono">.env</code> file at the root of the repo.
        </li>
        <li>
          Set <code className="font-mono">ADMIN_EMAILS={email}</code> (separate several with commas).
        </li>
        <li>
          Stop <code className="font-mono">pnpm dev</code> (Ctrl+C) and start it again. The file is only read at startup.
        </li>
        <li>Reload this page.</li>
      </ol>
      <p className="text-xs text-muted">This help only appears in development. In production this page is a 404 for non-reviewers.</p>
    </main>
  );
}
