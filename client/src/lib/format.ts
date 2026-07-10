import type { Comparator, Kpi, KpiStatus, Unit } from './types';

const COMPARATOR_SYMBOL: Record<Comparator, string> = {
  EQ: '=',
  GT: '>',
  GTE: '≥',
  LT: '<',
  LTE: '≤',
  BETWEEN: 'between',
};

export function formatValue(unit: Unit, value: number): string {
  switch (unit) {
    case 'PERCENT':
      return `${value}%`;
    case 'DOLLARS':
      return `$${value.toLocaleString('en-US')}`;
    case 'NUMBER':
      return `${value}`;
  }
}

export function goalRuleText(kpi: Kpi): string {
  if (kpi.comparator === 'BETWEEN' && kpi.goalUpper !== null) {
    return `Goal ${formatValue(kpi.unit, kpi.goal)} to ${formatValue(kpi.unit, kpi.goalUpper)}`;
  }
  return `Goal ${COMPARATOR_SYMBOL[kpi.comparator]} ${formatValue(kpi.unit, kpi.goal)}`;
}

export const STATUS_LABEL: Record<KpiStatus, string> = {
  green: 'On target',
  yellow: 'Watch',
  red: 'Off target',
  no_data: 'No data',
};
