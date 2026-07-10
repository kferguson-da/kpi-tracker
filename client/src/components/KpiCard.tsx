import type { Kpi } from '../lib/types';
import { formatValue, goalRuleText, ownerLabel } from '../lib/format';
import { StatusBadge } from './StatusBadge';
import { Sparkline } from './Sparkline';

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const latestPeriod = kpi.recentReadings.at(-1)?.periodKey;

  return (
    <article className="kpi-card">
      <div className="kpi-card__top">
        <div>
          <div className="kpi-card__name">{kpi.name}</div>
          <div className="kpi-card__rule">{goalRuleText(kpi)}</div>
        </div>
        <StatusBadge status={kpi.status} />
      </div>

      <div className="kpi-card__value">
        {kpi.currentValue === null ? (
          <span className="muted">n/a</span>
        ) : (
          formatValue(kpi.unit, kpi.currentValue)
        )}
      </div>

      {kpi.recentReadings.length > 0 ? (
        <Sparkline readings={kpi.recentReadings} goal={kpi.goal} status={kpi.status} />
      ) : (
        <div className="spark--none">Trend appears after the first reading</div>
      )}

      <div className="kpi-card__foot">
        <span className="cadence">{kpi.cadence.toLowerCase()}</span>
        <span>{latestPeriod ?? 'No readings yet'}</span>
      </div>

      <div className="kpi-card__owner">Owner · {ownerLabel(kpi.owner)}</div>
    </article>
  );
}
