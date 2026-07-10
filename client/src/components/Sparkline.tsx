import type { KpiStatus, Reading } from '../lib/types';

const W = 240;
const H = 40;
const PAD = 4;

const STROKE: Record<KpiStatus, string> = {
  green: 'var(--success)',
  yellow: 'var(--warning)',
  red: 'var(--error)',
  no_data: 'var(--text-muted)',
};

// Inline SVG trend. Status-colored (reinforces the labeled badge, never the sole
// signal) with a faint goal reference line.
export function Sparkline({
  readings,
  goal,
  status,
}: {
  readings: Reading[];
  goal: number;
  status: KpiStatus;
}) {
  if (readings.length === 0) {
    return null;
  }

  const values = readings.map((r) => r.value);
  const lo = Math.min(...values, goal);
  const hi = Math.max(...values, goal);
  const span = hi - lo || 1;

  const x = (i: number) =>
    readings.length === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (readings.length - 1);
  const y = (v: number) => H - PAD - ((v - lo) / span) * (H - 2 * PAD);

  const points = readings.map((r, i) => `${x(i)},${y(r.value)}`).join(' ');
  const lastValue = values[values.length - 1] ?? goal;

  return (
    <svg
      className="spark"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Recent trend"
      style={{ color: STROKE[status] }}
    >
      <line className="spark__goal" x1={0} y1={y(goal)} x2={W} y2={y(goal)} />
      {readings.length === 1 ? (
        <circle className="spark__pt" cx={x(0)} cy={y(lastValue)} r={3} />
      ) : (
        <>
          <polyline className="spark__line" points={points} />
          <circle className="spark__pt" cx={x(readings.length - 1)} cy={y(lastValue)} r={2.6} />
        </>
      )}
    </svg>
  );
}
