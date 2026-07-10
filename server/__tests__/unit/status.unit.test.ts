import { describe, it, expect } from 'vitest';
import type { Comparator } from '@prisma/client';
import { computeStatus, type KpiStatus } from '../../src/utils/status';

describe('computeStatus', () => {
  it('should_return_no_data_when_there_is_no_reading', () => {
    expect(computeStatus('GTE', 100, null, null)).toBe('no_data');
  });

  interface Case {
    comparator: Comparator;
    goal: number;
    goalUpper: number | null;
    value: number;
    expected: KpiStatus;
    why: string;
  }

  const cases: Case[] = [
    // GTE (higher is better)
    {
      comparator: 'GTE',
      goal: 100,
      goalUpper: null,
      value: 100,
      expected: 'green',
      why: 'at target',
    },
    {
      comparator: 'GTE',
      goal: 100,
      goalUpper: null,
      value: 120,
      expected: 'green',
      why: 'beyond target',
    },
    {
      comparator: 'GTE',
      goal: 100,
      goalUpper: null,
      value: 95,
      expected: 'yellow',
      why: '5% below',
    },
    {
      comparator: 'GTE',
      goal: 100,
      goalUpper: null,
      value: 90,
      expected: 'yellow',
      why: 'exactly 10% below',
    },
    {
      comparator: 'GTE',
      goal: 100,
      goalUpper: null,
      value: 89.9,
      expected: 'red',
      why: 'just over 10% below',
    },
    { comparator: 'GTE', goal: 100, goalUpper: null, value: 80, expected: 'red', why: '20% below' },

    // GT (strict) — at the goal is a near miss, not a pass
    { comparator: 'GT', goal: 100, goalUpper: null, value: 101, expected: 'green', why: 'above' },
    {
      comparator: 'GT',
      goal: 100,
      goalUpper: null,
      value: 100,
      expected: 'yellow',
      why: 'equal misses by 0%',
    },

    // LTE (lower is better)
    { comparator: 'LTE', goal: 6, goalUpper: null, value: 6, expected: 'green', why: 'at target' },
    {
      comparator: 'LTE',
      goal: 6,
      goalUpper: null,
      value: 5,
      expected: 'green',
      why: 'below target',
    },
    {
      comparator: 'LTE',
      goal: 6,
      goalUpper: null,
      value: 6.4,
      expected: 'yellow',
      why: '~6.7% over',
    },
    { comparator: 'LTE', goal: 6, goalUpper: null, value: 9, expected: 'red', why: '50% over' },

    // LT (strict)
    { comparator: 'LT', goal: 6, goalUpper: null, value: 5.9, expected: 'green', why: 'below' },
    {
      comparator: 'LT',
      goal: 6,
      goalUpper: null,
      value: 6,
      expected: 'yellow',
      why: 'equal misses by 0%',
    },

    // EQ — band applies symmetrically
    { comparator: 'EQ', goal: 50, goalUpper: null, value: 50, expected: 'green', why: 'exact' },
    { comparator: 'EQ', goal: 50, goalUpper: null, value: 47, expected: 'yellow', why: '6% off' },
    {
      comparator: 'EQ',
      goal: 50,
      goalUpper: null,
      value: 55,
      expected: 'yellow',
      why: 'exactly 10% over',
    },
    { comparator: 'EQ', goal: 50, goalUpper: null, value: 40, expected: 'red', why: '20% off' },

    // BETWEEN — inside range green; band around the nearer missed bound
    {
      comparator: 'BETWEEN',
      goal: 5,
      goalUpper: 10,
      value: 7,
      expected: 'green',
      why: 'inside range',
    },
    {
      comparator: 'BETWEEN',
      goal: 5,
      goalUpper: 10,
      value: 5,
      expected: 'green',
      why: 'at lower bound',
    },
    {
      comparator: 'BETWEEN',
      goal: 5,
      goalUpper: 10,
      value: 10,
      expected: 'green',
      why: 'at upper bound',
    },
    {
      comparator: 'BETWEEN',
      goal: 5,
      goalUpper: 10,
      value: 4.7,
      expected: 'yellow',
      why: 'within 10% of lower',
    },
    {
      comparator: 'BETWEEN',
      goal: 5,
      goalUpper: 10,
      value: 4.4,
      expected: 'red',
      why: '12% below lower',
    },
    {
      comparator: 'BETWEEN',
      goal: 5,
      goalUpper: 10,
      value: 11,
      expected: 'yellow',
      why: 'exactly 10% above upper',
    },
    {
      comparator: 'BETWEEN',
      goal: 5,
      goalUpper: 10,
      value: 12,
      expected: 'red',
      why: '20% above upper',
    },

    // Zero-bound edge: any miss against a zero bound is off target
    {
      comparator: 'GTE',
      goal: 0,
      goalUpper: null,
      value: 0,
      expected: 'green',
      why: 'meets zero goal',
    },
    {
      comparator: 'GTE',
      goal: 0,
      goalUpper: null,
      value: -5,
      expected: 'red',
      why: 'misses a zero bound',
    },
  ];

  it.each(cases)(
    'should_be_$expected_for_$comparator_goal_$goal_value_$value ($why)',
    ({ comparator, goal, goalUpper, value, expected }) => {
      expect(computeStatus(comparator, goal, goalUpper, value)).toBe(expected);
    },
  );
});
