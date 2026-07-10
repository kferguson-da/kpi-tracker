export interface Me {
  email: string;
  name: string | null;
  isAdmin: boolean;
}

export type KpiStatus = 'green' | 'yellow' | 'red' | 'no_data';
export type Unit = 'NUMBER' | 'PERCENT' | 'DOLLARS';
export type Comparator = 'EQ' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'BETWEEN';
export type Cadence = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

export interface Reading {
  periodKey: string;
  value: number;
}

export interface CreateKpiInput {
  name: string;
  description?: string;
  unit: Unit;
  comparator: Comparator;
  goal: number;
  goalUpper?: number;
  cadence: Cadence;
}

export interface Kpi {
  id: string;
  name: string;
  description: string | null;
  unit: Unit;
  comparator: Comparator;
  goal: number;
  goalUpper: number | null;
  cadence: Cadence;
  ownerId: string;
  owner: { email: string; name: string | null };
  archivedAt: string | null;
  createdAt: string;
  currentValue: number | null;
  status: KpiStatus;
  recentReadings: Reading[];
  canEdit: boolean;
}

export interface UpdateKpiInput {
  name?: string;
  description?: string | null;
  unit?: Unit;
  comparator?: Comparator;
  goal?: number;
  goalUpper?: number | null;
  cadence?: Cadence;
}
