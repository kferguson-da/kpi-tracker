import { describe, it, expect } from 'vitest';
import { goalRuleError } from '../../src/utils/goalRule';

describe('goalRuleError', () => {
  it('should_accept_a_valid_non_between_rule', () => {
    expect(goalRuleError('GTE', 90, null)).toBeNull();
  });

  it('should_accept_a_valid_between_rule', () => {
    expect(goalRuleError('BETWEEN', 5, 10)).toBeNull();
  });

  it('should_reject_a_non_finite_goal', () => {
    expect(goalRuleError('GTE', Number.NaN, null)).toMatch(/goal must be a finite/);
  });

  it('should_reject_between_without_an_upper_value', () => {
    expect(goalRuleError('BETWEEN', 5, null)).toMatch(/goalUpper is required/);
  });

  it('should_reject_between_when_upper_not_greater_than_goal', () => {
    expect(goalRuleError('BETWEEN', 10, 5)).toMatch(/greater than goal/);
  });

  it('should_reject_an_upper_value_on_a_non_between_rule', () => {
    expect(goalRuleError('GTE', 90, 100)).toMatch(/only allowed when the comparator is between/);
  });
});
