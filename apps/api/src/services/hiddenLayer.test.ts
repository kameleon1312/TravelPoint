import { describe, expect, it, vi } from 'vitest';
import { resolveSpotForViewer } from './hiddenLayer';

const baseSpot = {
  id: 'spot-a',
  title: 'Hidden place',
  story: null,
  category: 'ABANDONED',
  lat: 52.1,
  lng: 21.1,
  h3Index: 'h3',
  circleId: null,
  dropExpiresAt: null,
  ownerId: 'owner',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const viewer = {
  id: 'viewer',
  rank: 'NEWCOMER' as 'NEWCOMER' | 'LEGEND',
  circleIds: [] as string[],
  tier: 'FREE' as 'FREE' | 'PRO' | 'EXPEDITION',
};

describe('resolveSpotForViewer', () => {
  it('completely hides circle-only spots from outsiders', async () => {
    const result = await resolveSpotForViewer(
      { ...baseSpot, accessLevel: 'CIRCLE_ONLY', circleId: 'circle-a' },
      viewer,
      vi.fn(),
    );

    expect(result).toBeNull();
  });

  it('returns circle-only spots to members and audits access', async () => {
    const audit = vi.fn(async () => undefined);
    const result = await resolveSpotForViewer(
      { ...baseSpot, accessLevel: 'CIRCLE_ONLY', circleId: 'circle-a' },
      { ...viewer, circleIds: ['circle-a'] },
      audit,
    );

    expect(result).toMatchObject({ id: 'spot-a', locked: false });
    expect(audit).toHaveBeenCalledWith('viewer', 'spot-a');
  });

  it('removes expired secret drops even for their owner', async () => {
    const result = await resolveSpotForViewer(
      {
        ...baseSpot,
        accessLevel: 'SECRET_DROP',
        dropExpiresAt: new Date(Date.now() - 1_000),
      },
      { ...viewer, id: 'owner' },
      vi.fn(),
    );

    expect(result).toBeNull();
  });

  it('keeps trusted spots as metadata-only locked pins for low-rank viewers', async () => {
    const result = await resolveSpotForViewer(
      { ...baseSpot, accessLevel: 'TRUSTED' },
      viewer,
      vi.fn(),
    );

    expect(result).toMatchObject({
      id: 'spot-a',
      locked: true,
      requiredAccess: 'TRUSTED',
    });
    expect(result?.lat).not.toBe(baseSpot.lat);
  });

  it('unlocks TRUSTED spots by plan (PRO+), not by rank', async () => {
    const trusted = { ...baseSpot, accessLevel: 'TRUSTED' as const };
    expect(await resolveSpotForViewer(trusted, { ...viewer, rank: 'LEGEND' }, vi.fn())).toMatchObject({ locked: true });
    expect(await resolveSpotForViewer(trusted, { ...viewer, tier: 'PRO' }, vi.fn())).toMatchObject({ locked: false });
    expect(await resolveSpotForViewer(trusted, { ...viewer, tier: 'EXPEDITION' }, vi.fn())).toMatchObject({ locked: false });
  });

  it('keeps active secret drops locked below EXPEDITION', async () => {
    const drop = { ...baseSpot, accessLevel: 'SECRET_DROP' as const, dropExpiresAt: new Date(Date.now() + 3_600_000) };
    expect(await resolveSpotForViewer(drop, { ...viewer, tier: 'PRO' }, vi.fn()))
      .toMatchObject({ locked: true, requiredAccess: 'SECRET_DROP' });
    expect(await resolveSpotForViewer(drop, { ...viewer, tier: 'EXPEDITION' }, vi.fn())).toMatchObject({ locked: false });
    expect(await resolveSpotForViewer(drop, { ...viewer, id: 'owner' }, vi.fn())).toMatchObject({ locked: false });
  });

  it('returns the same locked pin on repeated requests so it cannot be averaged out', async () => {
    const resolve = () => resolveSpotForViewer({ ...baseSpot, accessLevel: 'TRUSTED' }, viewer, vi.fn());
    const [a, b] = await Promise.all([resolve(), resolve()]);
    expect(a?.lat).toBe(b?.lat);
    expect(a?.lng).toBe(b?.lng);
  });
});
