import { describe, expect, it } from 'vitest';
import { initialRoleForEmail } from '../../src/utils/roles.js';

describe('initialRoleForEmail', () => {
  it('should_return_admin_when_email_matches_seed_admin', () => {
    expect(initialRoleForEmail('boss@dealershipaccelerator.io', 'boss@dealershipaccelerator.io')).toBe(
      'admin',
    );
  });

  it('should_match_seed_admin_case_insensitively', () => {
    expect(initialRoleForEmail('Boss@Dealershipaccelerator.IO', 'boss@dealershipaccelerator.io')).toBe(
      'admin',
    );
  });

  it('should_return_viewer_when_email_does_not_match_seed_admin', () => {
    expect(initialRoleForEmail('user@dealershipaccelerator.io', 'boss@dealershipaccelerator.io')).toBe(
      'viewer',
    );
  });

  it('should_return_viewer_when_no_seed_admin_configured', () => {
    expect(initialRoleForEmail('user@dealershipaccelerator.io', null)).toBe('viewer');
  });
});
