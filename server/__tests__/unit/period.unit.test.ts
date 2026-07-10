import { describe, it, expect } from 'vitest';
import { periodKeyError } from '../../src/utils/period';

describe('periodKeyError', () => {
  it('should_accept_a_valid_monthly_key', () => {
    expect(periodKeyError('MONTHLY', '2026-06')).toBeNull();
  });

  it('should_accept_a_valid_weekly_key', () => {
    expect(periodKeyError('WEEKLY', '2026-W26')).toBeNull();
  });

  it('should_accept_a_valid_quarterly_key', () => {
    expect(periodKeyError('QUARTERLY', '2026-Q2')).toBeNull();
  });

  it('should_reject_a_month_out_of_range', () => {
    expect(periodKeyError('MONTHLY', '2026-13')).toMatch(/2026-06/);
  });

  it('should_reject_a_weekly_key_for_a_monthly_kpi', () => {
    expect(periodKeyError('MONTHLY', '2026-W26')).not.toBeNull();
  });

  it('should_reject_a_quarter_out_of_range', () => {
    expect(periodKeyError('QUARTERLY', '2026-Q5')).not.toBeNull();
  });

  it('should_reject_garbage', () => {
    expect(periodKeyError('MONTHLY', 'june')).not.toBeNull();
  });
});
