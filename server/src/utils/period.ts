import type { Cadence } from '@prisma/client';

// periodKey formats by cadence: "2026-W26", "2026-06", "2026-Q2". Because a KPI's
// readings all share its cadence, these sort lexicographically by recency, which
// is how the current value is picked.
const PATTERNS: Record<Cadence, RegExp> = {
  WEEKLY: /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/,
  MONTHLY: /^\d{4}-(0[1-9]|1[0-2])$/,
  QUARTERLY: /^\d{4}-Q[1-4]$/,
};

const EXAMPLES: Record<Cadence, string> = {
  WEEKLY: '2026-W26',
  MONTHLY: '2026-06',
  QUARTERLY: '2026-Q2',
};

// Returns an error string if periodKey does not match the cadence, else null.
export function periodKeyError(cadence: Cadence, periodKey: string): string | null {
  if (PATTERNS[cadence].test(periodKey)) {
    return null;
  }
  return `periodKey must look like ${EXAMPLES[cadence]} for a ${cadence.toLowerCase()} KPI`;
}
