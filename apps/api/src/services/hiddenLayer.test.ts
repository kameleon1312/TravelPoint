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
  rank: 'NEWCOMER' as const,
  circleIds: [] as string[],
  tier: 'FREE',
};

describe('resolveSpotForViewer', () => {
  it('completely hides circle-only spots from outsiders', async () => {
    const result = await resolveSpotForViewer(
      { ...baseSpot, accessLevel: 'CIRCLE_ONLY', circleId: 'circle-a' },
      viewer,
      1,
      vi.fn(),
    );

    expect(result).toBeNull();
  });

  it('returns circle-only spots to members and audits access', async () => {
    const audit = vi.fn(async () => undefined);
    const result = await resolveSpotForViewer(
      { ...baseSpot, accessLevel: 'CIRCLE_ONLY', circleId: 'circle-a' },
      { ...viewer, circleIds: ['circle-a'] },
      1,
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
      1,
      vi.fn(),
    );

    expect(result).toBeNull();
  });

  it('keeps trusted spots as metadata-only locked pins for low-rank viewers', async () => {
    const result = await resolveSpotForViewer(
      { ...baseSpot, accessLevel: 'TRUSTED' },
      viewer,
      1,
      vi.fn(),
    );

    expect(result).toMatchObject({
      id: 'spot-a',
      locked: true,
      requiredAccess: 'TRUSTED',
    });
    expect(result?.lat).not.toBe(baseSpot.lat);
  });
});
