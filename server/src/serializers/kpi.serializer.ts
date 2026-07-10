import type { KpiWithReadings } from '../models/kpi.model';
import { computeStatus } from '../utils/status';

// The API shape of a KPI: Decimal goals as numbers, the current value and status
// derived from the latest reading, and a bounded ascending recent series for the
// inline sparkline.
export function serializeKpi(kpi: KpiWithReadings) {
  const goal = Number(kpi.goal);
  const goalUpper = kpi.goalUpper === null ? null : Number(kpi.goalUpper);

  // kpi.readings is latest-first (ordered desc, capped); the newest is current.
  const latest = kpi.readings[0];
  const currentValue = latest ? Number(latest.value) : null;
  const recentReadings = [...kpi.readings]
    .reverse()
    .map((r) => ({ periodKey: r.periodKey, value: Number(r.value) }));

  return {
    id: kpi.id,
    name: kpi.name,
    description: kpi.description,
    unit: kpi.unit,
    comparator: kpi.comparator,
    goal,
    goalUpper,
    cadence: kpi.cadence,
    ownerId: kpi.ownerId,
    owner: { email: kpi.owner.email, name: kpi.owner.name },
    archivedAt: kpi.archivedAt,
    createdAt: kpi.createdAt,
    currentValue,
    status: computeStatus(kpi.comparator, goal, goalUpper, currentValue),
    recentReadings,
  };
}
