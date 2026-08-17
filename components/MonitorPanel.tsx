'use client';

import { FLAG_META, type FlagType } from '@/lib/types';
import type { LiveFlag } from '@/lib/useMonitor';

/**
 * The live status panel. The competitor put this in a right-hand column that
 * the student never looked at while answering, and it silently accumulated 40
 * violations. We keep the full record here, but the single most severe live
 * flag is ALSO surfaced next to the answer area, where the eye already is.
 */
export function MonitorPanel({
  flags,
  noiseLevel,
  cameraOn,
  micOn,
}: {
  flags: LiveFlag[];
  noiseLevel: number;
  cameraOn: boolean;
  micOn: boolean;
}) {
  const counts = new Map<FlagType, number>();
  for (const f of flags) counts.set(f.type, (counts.get(f.type) ?? 0) + 1);

  const rows = [...counts.entries()].sort((a, b) => {
    const order = { critical: 0, moderate: 1, minor: 2 } as const;
    return order[FLAG_META[a[0]].severity] - order[FLAG_META[b[0]].severity];
  });

  const total = flags.length;

  return (
    <section
      className="rounded-card border border-line bg-surface p-4 shadow-card"
      aria-label="Interview monitor"
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-ink-soft">Monitor</h2>
        <span className="flex items-center gap-2 text-micro font-medium text-ink-quiet">
          Recording
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-stop" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-stop" />
          </span>
        </span>
      </header>

      {/* B27: three columns is tight at 360px, so start at two and widen. */}
      <div className="mb-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
        <Stat label="Camera" value={cameraOn ? 'On' : 'Off'} good={cameraOn} />
        <Stat label="Mic" value={micOn ? 'On' : 'Off'} good={micOn} />
        <Stat
          label="Flags"
          value={String(total)}
          good={total === 0}
          warn={total > 0 && total < 5}
        />
      </div>

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-micro text-ink-quiet">
          <span>Sound level</span>
          <span>{noiseLevel > 0.045 ? 'Noisy room' : noiseLevel > 0.01 ? 'Good' : 'Very quiet'}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunk">
          <div
            className={`h-full rounded-full transition-all duration-100 ${
              noiseLevel > 0.045 ? 'bg-warn' : 'bg-go'
            }`}
            style={{ width: `${Math.min(100, noiseLevel * 320)}%` }}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-control bg-go-tint px-3 py-2.5 text-micro leading-snug text-go-dark">
          No problems so far. Keep looking at the camera and stay on this screen.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map(([type, count]) => {
            const meta = FLAG_META[type];
            const tone =
              meta.severity === 'critical'
                ? 'border-stop/40 bg-stop-tint text-stop'
                : meta.severity === 'moderate'
                  ? 'border-warn/40 bg-warn-tint text-warn'
                  : 'border-line bg-surface-sunk text-ink-soft';
            return (
              <li key={type} className={`rounded-control border-l-4 px-3 py-2 text-micro ${tone}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{meta.label}</span>
                  <span className="shrink-0 rounded-full bg-surface/70 px-2 py-0.5 text-micro font-bold">
                    {count}
                  </span>
                </div>
                <p className="mt-0.5 leading-snug opacity-90">{meta.studentMessage}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  good,
  warn,
}: {
  label: string;
  value: string;
  good: boolean;
  warn?: boolean;
}) {
  const tone = good
    ? 'bg-go-tint text-go-dark'
    : warn
      ? 'bg-warn-tint text-warn'
      : 'bg-stop-tint text-stop';
  return (
    <div className={`rounded-control px-2 py-1.5 ${tone}`}>
      <div className="text-micro font-medium uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}
