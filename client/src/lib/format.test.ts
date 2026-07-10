import { describe, it, expect } from 'vitest';
import { ownerLabel } from './format';

describe('ownerLabel', () => {
  it('should_prefer_the_display_name_when_present', () => {
    expect(ownerLabel({ email: 'kevin@dealershipaccelerator.io', name: 'Kevin Ferguson' })).toBe(
      'Kevin Ferguson',
    );
  });

  it('should_drop_the_company_domain_when_there_is_no_name', () => {
    expect(ownerLabel({ email: 'kevin@dealershipaccelerator.io', name: null })).toBe('kevin');
  });

  it('should_keep_the_full_email_for_other_domains', () => {
    expect(ownerLabel({ email: 'ext@partner.com', name: null })).toBe('ext@partner.com');
  });
});
