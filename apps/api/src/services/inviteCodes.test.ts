import { describe, expect, it } from 'vitest';
import { validateInvite } from './inviteCodes';

const now = new Date('2026-06-10T12:00:00.000Z');

function invite(overrides: Partial<Parameters<typeof validateInvite>[0]> = {}) {
  return {
    purpose: 'CIRCLE' as const,
    circleId: 'circle-a',
    expiresAt: new Date('2026-06-11T12:00:00.000Z'),
    maxUses: 1,
    useCount: 0,
    ...overrides,
  };
}

describe('validateInvite', () => {
  it('accepts an active invite scoped to the expected circle', () => {
    expect(validateInvite(invite(), 'CIRCLE', 'circle-a', now)).toBeNull();
  });

  it('rejects an invite issued for a different circle', () => {
    expect(validateInvite(invite(), 'CIRCLE', 'circle-b', now))
      .toBe('INVITE_WRONG_CIRCLE');
  });

  it('rejects an account invite used as a circle invite', () => {
    expect(validateInvite(invite({ purpose: 'ACCOUNT', circleId: null }), 'CIRCLE', 'circle-a', now))
      .toBe('INVITE_WRONG_PURPOSE');
  });

  it('rejects expired and exhausted invites', () => {
    expect(validateInvite(invite({ expiresAt: now }), 'CIRCLE', 'circle-a', now))
      .toBe('INVITE_EXPIRED');
    expect(validateInvite(invite({ useCount: 1 }), 'CIRCLE', 'circle-a', now))
      .toBe('INVITE_EXHAUSTED');
  });
});
