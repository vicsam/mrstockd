export interface Stat {
  label: string;
  value: string;
  /** A short line under the value, e.g. "of 4 tools". */
  note?: string;
}

/** Headline numbers above a dashboard. */
export function StatTiles({ stats }: { stats: Stat[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-current/15 p-4">
          <dt className="text-xs text-muted">{s.label}</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{s.value}</dd>
          {s.note ? <dd className="mt-0.5 text-xs text-muted">{s.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
