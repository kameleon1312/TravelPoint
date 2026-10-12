import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestToken } from '../lib/testHelpers';

const pushSignal = vi.fn(async () => {});
vi.mock('./signals', () => ({ pushSignal }));
vi.mock('../services/push', () => ({ sendPushToExplorer: vi.fn(async () => {}) }));
vi.mock('../services/trustScore', () => ({
  addTrustPoints: vi.fn(async () => {}),
  TrustPoints: { SPOT_CREATED: 5 },
}));

const { spotsRoutes } = await import('./spots');

const BASE_BODY = { title: 'Old bunker', category: 'ABANDONED', lat: 52.1, lng: 21.1 };

function buildPrisma(overrides: {
  memberOf: string[];
  explorers?: Array<{ id: string; circleIds: string[] }>;
  ownerTier?: 'FREE' | 'PRO' | 'EXPEDITION';
}) {
  const spotCreate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    id: 'new-spot', story: null, dropExpiresAt: null, circleId: null,
    createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    ...data,
  }));
  const prisma = {
    explorer: {
      findFirst: vi.fn(async () => ({ id: 'owner', suspendedAt: null })),
      findUnique: vi.fn(async () => ({ tier: overrides.ownerTier ?? 'FREE' })),
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        (overrides.explorers ?? [])
          .filter((e) => where.id.in.includes(e.id))
          .map((e) => ({ id: e.id, rank: 'NEWCOMER', tier: 'FREE', memberships: e.circleIds.map((circleId) => ({ circleId })) }))),
    },
    circleMember: {
      findUnique: vi.fn(async ({ where }: { where: { circleId_explorerId: { circleId: string } } }) =>
        overrides.memberOf.includes(where.circleId_explorerId.circleId) ? { circleId: where.circleId_explorerId.circleId } : null),
      findMany: vi.fn(async ({ where }: { where: { explorerId: unknown } }) =>
        typeof where.explorerId === 'string'
          ? overrides.memberOf.map((circleId) => ({ circleId }))
          : (overrides.explorers ?? []).map((e) => ({ explorerId: e.id }))),
    },
    spot: { create: spotCreate },
    $executeRaw: vi.fn(async () => 0),
  } as unknown as FastifyInstance['prisma'];
  return { prisma, spotCreate };
}

describe('POST /api/spots access rules', () => {
  const apps: FastifyInstance[] = [];
  afterEach(async () => {
    pushSignal.mockClear();
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  async function post(prisma: FastifyInstance['prisma'], body: Record<string, unknown>) {
    const app = Fastify();
    apps.push(app);
    app.decorate('prisma', prisma);
    await app.register(spotsRoutes);
    return app.inject({
      method: 'POST',
      url: '/api/spots',
      headers: { authorization: `Bearer ${createTestToken('owner')}` },
      payload: body,
    });
  }

  it('rejects linking a spot to a circle the creator is not a member of', async () => {
    const { prisma, spotCreate } = buildPrisma({ memberOf: [] });
    const res = await post(prisma, { ...BASE_BODY, accessLevel: 'CIRCLE_ONLY', circleId: 'clh0000000000000000000000' });
    expect(res.statusCode).toBe(403);
    expect(spotCreate).not.toHaveBeenCalled();
  });

  it('rejects CIRCLE_ONLY without a circle and SECRET_DROP without a future expiry', async () => {
    const { prisma, spotCreate } = buildPrisma({ memberOf: [] });
    expect((await post(prisma, { ...BASE_BODY, accessLevel: 'CIRCLE_ONLY' })).statusCode).toBe(400);
    expect((await post(prisma, { ...BASE_BODY, accessLevel: 'SECRET_DROP' })).statusCode).toBe(400);
    expect(spotCreate).not.toHaveBeenCalled();
  });

  it('requires the EXPEDITION plan to create a secret drop', async () => {
    const dropExpiresAt = new Date(Date.now() + 24 * 3_600_000).toISOString();
    const free = buildPrisma({ memberOf: [], ownerTier: 'PRO' });
    expect((await post(free.prisma, { ...BASE_BODY, accessLevel: 'SECRET_DROP', dropExpiresAt })).statusCode).toBe(403);
    expect(free.spotCreate).not.toHaveBeenCalled();

    const expedition = buildPrisma({ memberOf: [], ownerTier: 'EXPEDITION' });
    expect((await post(expedition.prisma, { ...BASE_BODY, accessLevel: 'SECRET_DROP', dropExpiresAt })).statusCode).toBe(201);
  });

  it('signals a circle-only spot only to members of that circle', async () => {
    const circleA = 'clh0000000000000000000001';
    const circleB = 'clh0000000000000000000002';
    const { prisma } = buildPrisma({
      memberOf: [circleA, circleB],
      explorers: [
        { id: 'insider', circleIds: [circleA] },
        { id: 'outsider', circleIds: [circleB] },
      ],
    });
    const res = await post(prisma, { ...BASE_BODY, accessLevel: 'CIRCLE_ONLY', circleId: circleA });
    expect(res.statusCode).toBe(201);

    await vi.waitFor(() => expect(pushSignal).toHaveBeenCalled());
    const recipients = pushSignal.mock.calls.map((call) => (call as unknown as [unknown, string])[1]);
    expect(recipients).toEqual(['insider']);
  });
});
