export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-8 px-4 py-16">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium tracking-wide text-stock uppercase">MrStockd</p>
        <a href="/sign-in" className="text-sm font-medium underline-offset-4 hover:underline">
          Sign in
        </a>
      </div>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">AI tools, in stock.</h1>
      <p className="max-w-xl text-lg text-muted">
        Everything your team and your AI agents need, in stock. Find a tool, pay with PayPal, and start
        using it in seconds, whether you are a person or an agent shopping on someone&apos;s behalf.
      </p>
      <div className="flex flex-wrap gap-3">
        <a href="/tools" className="inline-flex min-h-11 items-center rounded-full bg-stock px-5 py-2.5 font-medium text-ink">
          Browse tools
        </a>
        <a href="/sell" className="inline-flex min-h-11 items-center rounded-full border border-current/20 px-5 py-2.5 font-medium">
          Sell a tool
        </a>
      </div>
    </main>
  );
}
