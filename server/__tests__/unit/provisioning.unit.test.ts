import { describe, it, expect } from 'vitest';
import { initialUserFields } from '../../src/utils/provisioning';

describe('initialUserFields', () => {
  it('should_flag_admin_when_email_matches_seed_admin', () => {
    expect(initialUserFields('Boss@DA.io', 'boss@da.io')).toEqual({
      email: 'boss@da.io',
      isAdmin: true,
    });
  });

  it('should_default_to_non_admin_when_email_differs_from_seed', () => {
    expect(initialUserFields('rep@da.io', 'boss@da.io').isAdmin).toBe(false);
  });

  it('should_not_flag_admin_when_no_seed_admin_is_configured', () => {
    expect(initialUserFields('rep@da.io', null).isAdmin).toBe(false);
  });

  it('should_normalize_email_to_trimmed_lowercase', () => {
    expect(initialUserFields('  Rep@DA.io  ', null).email).toBe('rep@da.io');
  });
});
