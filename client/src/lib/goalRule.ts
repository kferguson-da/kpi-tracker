import type { Comparator } from './types';

// Thin client-side mirror of the server's goal-rule validation, used only for
// inline form hints. The server remains the source of truth.
export function goalRuleError(
  comparator: Comparator,
  goal: number,
  goalUpper: number | null,
): string | null {
  if (!Number.isFinite(goal)) {
    return 'Enter a numeric goal value.';
  }
  if (comparator === 'BETWEEN') {
    if (goalUpper === null) {
      return 'Enter an upper value for the between range.';
    }
    if (!Number.isFinite(goalUpper)) {
      return 'Upper value must be a number.';
    }
    if (goalUpper <= goal) {
      return 'Upper value must be greater than the lower value.';
    }
    return null;
  }
  if (goalUpper !== null) {
    return 'Upper value only applies to the between rule.';
  }
  return null;
}
