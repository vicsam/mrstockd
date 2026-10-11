import type { ToolActivity } from "@mrstockd/catalog";

function ago(date: Date, now: Date): string {
  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function statusLabel(code: number): { text: string; className: string } {
  if (code < 400) return { text: `${code} OK`, className: "text-stock" };
  if (code < 500) return { text: `${code}`, className: "text-amber-500" };
  return { text: `${code} failed`, className: "text-red-500" };
}

/** Calls to the seller's own tool. Server component. */
export function Activity({ activity, now }: { activity: ToolActivity; now: Date }) {
  const { last24h } = activity;
  const stats = [
    { label: "Calls, last 24 h", value: last24h.calls.toLocaleString("en-US") },
    { label: "Your test calls", value: last24h.testCalls.toLocaleString("en-US") },
    { label: "Failed (5xx)", value: last24h.failures.toLocaleString("en-US") },
    { label: "Avg response", value: last24h.avgLatencyMs === null ? "–" : `${last24h.avgLatencyMs} ms` },
  ];
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-current/15 p-3">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      {activity.recent.length === 0 ? (
        <p className="text-sm text-muted">No calls yet. Create a test key and try the command above.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Most recent calls</caption>
            <thead className="text-xs text-muted">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">When</th>
                <th scope="col" className="py-2 pr-4 font-medium">Result</th>
                <th scope="col" className="py-2 pr-4 font-medium">Time</th>
                <th scope="col" className="py-2 pr-4 font-medium">Key</th>
                <th scope="col" className="py-2 font-medium">Credits</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {activity.recent.map((call, i) => {
                const status = statusLabel(call.statusCode);
                return (
                  <tr key={i} className="border-t border-current/10">
                    <td className="py-2 pr-4">
                      <time dateTime={call.at.toISOString()}>{ago(call.at, now)}</time>
                    </td>
                    <td className={`py-2 pr-4 font-medium ${status.className}`}>{status.text}</td>
                    <td className="py-2 pr-4">{call.latencyMs} ms</td>
                    <td className="py-2 pr-4">{call.environment === "test" ? "Test" : "Buyer"}</td>
                    <td className="py-2">{call.creditsUsed}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted">
        {activity.allTimeCalls.toLocaleString("en-US")} call{activity.allTimeCalls === 1 ? "" : "s"} in total. Failed calls aren&apos;t charged.{" "}
        <a href="" className="underline underline-offset-4">
          Refresh
        </a>
      </p>
    </div>
  );
}
