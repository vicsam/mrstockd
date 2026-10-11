"use client";

import { useEffect, useRef, useState } from "react";

export interface DayPoint {
  day: string;
  calls: number;
  failures: number;
}

const H = 200;
const PAD = { top: 16, right: 8, bottom: 28, left: 36 };
const BAR_MAX = 24;
const GAP = 2;
const RADIUS = 4;

/** Rounds the axis top up to a clean number: 1, 2, 5, 10, 20, 50, … */
function niceMax(n: number): number {
  if (n <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(n));
  for (const step of [1, 2, 5, 10]) if (step * pow >= n) return step * pow;
  return 10 * pow;
}

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K` : String(n));
const dayLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** A column with a 4px rounded top and a square base, as a path. */
function column(x: number, y: number, w: number, h: number, roundTop: boolean): string {
  if (h <= 0) return "";
  const r = roundTop ? Math.min(RADIUS, h, w / 2) : 0;
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

/** Calls per day, successful and failed, with a hover tooltip and a table for screen readers. */
export function DailyCallsChart({ data, title }: { data: DayPoint[]; title: string }) {
  const [active, setActive] = useState<number | null>(null);
  // Drawn at its real pixel width, so labels stay readable on a phone instead of shrinking.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setW(Math.max(240, Math.round(entry!.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const max = niceMax(Math.max(...data.map((d) => d.calls), 0));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const band = plotW / data.length;
  const barW = Math.min(BAR_MAX, band * 0.6);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  // About one date label per 72px, always including the last day.
  const labelEvery = Math.ceil(data.length / Math.max(2, Math.floor(plotW / 72)));
  const total = data.reduce((n, d) => n + d.calls, 0);
  const failed = data.reduce((n, d) => n + d.failures, 0);
  const point = active === null ? null : data[active]!;

  return (
    <figure className="chart flex flex-col gap-3 rounded-xl border border-current/15 p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">{title}</span>
        <span className="flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="chart-swatch-ok inline-block size-2.5 rounded-sm" /> Successful
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="chart-swatch-fail inline-block size-2.5 rounded-sm" /> Failed (5xx)
          </span>
        </span>
      </figcaption>

      <div ref={box} className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full" role="img" aria-label={`${title}: ${total} calls, ${failed} failed`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="chart-grid" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="chart-axis">
                {compact(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = PAD.left + i * band + (band - barW) / 2;
            const ok = d.calls - d.failures;
            const okTop = y(ok);
            const failH = (d.failures / max) * plotH;
            return (
              <g key={d.day}>
                {/* Successful at the bottom; failed stacked on top, separated by a 2px gap. */}
                <path d={column(x, okTop, barW, y(0) - okTop, d.failures === 0)} className="chart-ok" />
                {d.failures > 0 ? (
                  <path d={column(x, okTop - failH - (ok > 0 ? GAP : 0), barW, failH, true)} className="chart-fail" />
                ) : null}
                {(i % labelEvery === 0 && data.length - 1 - i >= labelEvery / 2) || i === data.length - 1 ? (
                  <text x={x + barW / 2} y={H - 8} textAnchor="middle" className="chart-axis">
                    {dayLabel(d.day)}
                  </text>
                ) : null}
                {/* Hit target: the whole band, taller than the mark. */}
                <rect
                  x={PAD.left + i * band}
                  y={PAD.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${dayLabel(d.day)}: ${d.calls} calls, ${d.failures} failed`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="outline-none"
                />
              </g>
            );
          })}
          {point && active !== null ? (
            <rect
              x={PAD.left + active * band + 1}
              y={PAD.top}
              width={band - 2}
              height={plotH}
              className="chart-hover"
              pointerEvents="none"
            />
          ) : null}
        </svg>
        {point && active !== null ? (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-current/15 bg-paper px-3 py-2 text-xs shadow-lg dark:bg-ink"
            style={{ left: `${((PAD.left + active * band + band / 2) / W) * 100}%` }}
          >
            <div className="font-semibold">{dayLabel(point.day)}</div>
            <div>{point.calls.toLocaleString("en-US")} calls</div>
            <div className="text-muted">{point.failures.toLocaleString("en-US")} failed</div>
          </div>
        ) : null}
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Calls</th>
            <th scope="col">Failed</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              <td>{d.calls}</td>
              <td>{d.failures}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
