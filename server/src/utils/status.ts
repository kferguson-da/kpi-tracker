import type { Comparator } from '@prisma/client';

export type KpiStatus = 'green' | 'yellow' | 'red' | 'no_data';

// A value that misses its goal by no more than this fraction of the missed bound
// is "watch" (yellow) rather than "off target" (red).
export const YELLOW_BAND = 0.1;

// Server-only, single source of truth for a KPI's status. Given the goal rule and
// the current value, returns green / yellow / red / no_data. The API returns this;
// the client never recomputes it.
export function computeStatus(
  comparator: Comparator,
  goal: number,
  goalUpper: number | null,
  value: number | null,
): KpiStatus {
  if (value === null) {
    return 'no_data';
  }
  if (satisfiesRule(comparator, goal, goalUpper, value)) {
    return 'green';
  }

  const bound = missedBound(comparator, goal, goalUpper, value);
  if (bound === 0) {
    // No meaningful percentage band around a zero bound; any miss is off target.
    return 'red';
  }
  const miss = Math.abs(value - bound) / Math.abs(bound);
  return miss <= YELLOW_BAND ? 'yellow' : 'red';
}

function satisfiesRule(
  comparator: Comparator,
  goal: number,
  goalUpper: number | null,
  value: number,
): boolean {
  switch (comparator) {
    case 'EQ':
      return value === goal;
    case 'GT':
      return value > goal;
    case 'GTE':
      return value >= goal;
    case 'LT':
      return value < goal;
    case 'LTE':
      return value <= goal;
    case 'BETWEEN':
      return goalUpper !== null && value >= goal && value <= goalUpper;
  }
}

// The bound the value missed, used to size the yellow band. For between it is the
// nearer bound the value fell outside; otherwise it is the goal.
function missedBound(
  comparator: Comparator,
  goal: number,
  goalUpper: number | null,
  value: number,
): number {
  if (comparator === 'BETWEEN' && goalUpper !== null) {
    return value < goal ? goal : goalUpper;
  }
  return goal;
}
