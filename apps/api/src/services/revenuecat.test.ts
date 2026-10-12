import { describe, expect, it } from 'vitest';
import { decideRevenueCatAction, type RcWebhookBody } from './revenuecat';

const ev = (event: RcWebhookBody['event']): RcWebhookBody => ({ event });

describe('decideRevenueCatAction', () => {
  it('grants the highest entitlement on initial purchase', () => {
    const d = decideRevenueCatAction(
      ev({ type: 'INITIAL_PURCHASE', app_user_id: 'exp1', entitlement_ids: ['pro', 'expedition'], expiration_at_ms: 1_900_000_000_000 }),
      true,
    );
    expect(d).toEqual({ kind: 'grant', explorerId: 'exp1', tier: 'EXPEDITION', expiresAt: new Date(1_900_000_000_000) });
  });

  it('grants on renewal', () => {
    const d = decideRevenueCatAction(ev({ type: 'RENEWAL', app_user_id: 'exp1', entitlement_ids: ['pro'] }), true);
    expect(d).toMatchObject({ kind: 'grant', tier: 'PRO', expiresAt: null });
  });

  it('keeps access when auto-renew is turned off', () => {
    expect(decideRevenueCatAction(ev({ type: 'CANCELLATION', app_user_id: 'exp1' }), true))
      .toEqual({ kind: 'auto_renew_off', explorerId: 'exp1' });
  });

  it('keeps access during a billing issue grace period', () => {
    expect(decideRevenueCatAction(ev({ type: 'BILLING_ISSUE', app_user_id: 'exp1' }), true).kind).toBe('billing_issue');
  });

  it('revokes only on expiration', () => {
    expect(decideRevenueCatAction(ev({ type: 'EXPIRATION', app_user_id: 'exp1' }), true).kind).toBe('revoke');
  });

  it('ignores sandbox events in production but not in development', () => {
    const body = ev({ type: 'RENEWAL', app_user_id: 'exp1', entitlement_ids: ['pro'], environment: 'SANDBOX' });
    expect(decideRevenueCatAction(body, true).kind).toBe('ignore');
    expect(decideRevenueCatAction(body, false).kind).toBe('grant');
  });

  it('ignores anonymous RevenueCat ids', () => {
    expect(decideRevenueCatAction(ev({ type: 'RENEWAL', app_user_id: '$RCAnonymousID:abc', entitlement_ids: ['pro'] }), true).kind)
      .toBe('ignore');
  });

  it('ignores unknown entitlements and transfer events', () => {
    expect(decideRevenueCatAction(ev({ type: 'RENEWAL', app_user_id: 'exp1', entitlement_ids: ['other'] }), true).kind).toBe('ignore');
    expect(decideRevenueCatAction(ev({ type: 'TRANSFER', app_user_id: 'exp1' }), true).kind).toBe('ignore');
  });

  it('ignores malformed bodies', () => {
    expect(decideRevenueCatAction({}, true).kind).toBe('ignore');
  });
});
