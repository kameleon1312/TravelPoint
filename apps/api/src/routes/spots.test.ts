import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestToken } from '../lib/testHelpers';
import { spotsRoutes } from './spots';

describe('Hidden spot subresources', () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('does not expose circle-only photos to an outsider who knows the spot id', async () => {
    const photoFindMany = vi.fn();
    const prisma = {
      explorer: {
        findFirst: vi.fn(async () => ({ id: 'outsider', suspendedAt: null })),
        findUnique: vi.fn(async () => ({
          id: 'outsider',
          rank: 'NEWCOMER',
          tier: 'FREE',
          memberships: [],
        })),
      },
      spot: {
        findUnique: vi.fn(async () => ({
          id: 'secret-spot',
          title: 'Circle secret',
          story: null,
          category: 'ABANDONED',
          lat: 52.1,
          lng: 21.1,
          h3Index: 'h3',
          accessLevel: 'CIRCLE_ONLY',
          circleId: 'circle-a',
          dropExpiresAt: null,
          ownerId: 'owner',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        })),
      },
      photo: { findMany: photoFindMany },
      auditLog: { create: vi.fn() },
    } as unknown as FastifyInstance['prisma'];

    const app = Fastify();
    apps.push(app);
    app.decorate('prisma', prisma);
    await app.register(spotsRoutes);

    const response = await app.inject({
      method: 'GET',
      url: '/api/spots/secret-spot/photos',
      headers: { authorization: `Bearer ${createTestToken('outsider')}` },
    });

    expect(response.statusCode).toBe(404);
    expect(photoFindMany).not.toHaveBeenCalled();
  });
});
