import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { signAccessToken } from '../lib/jwt';
import { circleRoutes } from './circles';

describe('POST /api/circles/:slug/join', () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('rejects an invite issued for another circle without creating membership', async () => {
    const transaction = vi.fn();
    const prisma = {
      explorer: {
        findFirst: vi.fn(async () => ({ id: 'explorer-a' })),
      },
      circle: {
        findUnique: vi.fn(async () => ({
          id: 'circle-a',
          slug: 'alpha',
          isInviteOnly: true,
        })),
      },
      circleMember: {
        findUnique: vi.fn(async () => null),
      },
      inviteCode: {
        findUnique: vi.fn(async () => ({
          id: 'invite-b',
          code: 'other-circle',
          purpose: 'CIRCLE',
          circleId: 'circle-b',
          createdById: 'creator-b',
          usedById: null,
          expiresAt: new Date(Date.now() + 60_000),
          usedAt: null,
          maxUses: 1,
          useCount: 0,
          createdAt: new Date(),
        })),
      },
      $transaction: transaction,
    } as unknown as FastifyInstance['prisma'];

    const app = Fastify();
    apps.push(app);
    app.decorate('prisma', prisma);
    await app.register(circleRoutes);

    const response = await app.inject({
      method: 'POST',
      url: '/api/circles/alpha/join',
      headers: { authorization: `Bearer ${signAccessToken('explorer-a')}` },
      payload: { inviteCode: 'other-circle' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'INVITE_WRONG_CIRCLE' });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('does not expose circle members to an authenticated outsider', async () => {
    const memberQuery = vi.fn(async (args: {
      where?: { explorerId?: string };
    }) => args.where?.explorerId ? [] : [{ explorerId: 'member-a' }]);
    const prisma = {
      explorer: {
        findFirst: vi.fn(async () => ({ id: 'outsider' })),
      },
      circleMember: {
        findUnique: vi.fn(async () => null),
      },
      circle: {
        findUnique: vi.fn(async (args: { select?: { id?: boolean }; include?: unknown }) => {
          if (args.select) return { id: 'circle-a' };
          return {
            id: 'circle-a',
            slug: 'alpha',
            name: 'Alpha',
            members: await memberQuery({ where: { explorerId: 'outsider' } }),
            _count: { members: 1 },
          };
        }),
      },
    } as unknown as FastifyInstance['prisma'];

    const app = Fastify();
    apps.push(app);
    app.decorate('prisma', prisma);
    await app.register(circleRoutes);

    const response = await app.inject({
      method: 'GET',
      url: '/api/circles/alpha',
      headers: { authorization: `Bearer ${signAccessToken('outsider')}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ members: [], viewerRole: null });
    expect(memberQuery).toHaveBeenCalledWith({ where: { explorerId: 'outsider' } });
  });
});
