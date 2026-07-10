import type { Comparator } from '@prisma/client';

// Validates the goal rule. Returns a human-readable error, or null if valid.
// Pure and unit-tested; used by the create/update body validation.
export function goalRuleError(
  comparator: Comparator,
  goal: number,
  goalUpper: number | null,
): string | null {
  if (!Number.isFinite(goal)) {
    return 'goal must be a finite number';
  }

  if (comparator === 'BETWEEN') {
    if (goalUpper === null) {
      return 'goalUpper is required when the comparator is between';
    }
    if (!Number.isFinite(goalUpper)) {
      return 'goalUpper must be a finite number';
    }
    if (goalUpper <= goal) {
      return 'goalUpper must be greater than goal';
    }
    return null;
  }

  if (goalUpper !== null) {
    return 'goalUpper is only allowed when the comparator is between';
  }
  return null;
}
