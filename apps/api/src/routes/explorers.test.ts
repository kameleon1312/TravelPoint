import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestToken } from '../lib/testHelpers';
import { explorerRoutes } from './explorers';

describe('Explorer sensitive data', () => {
  const apps: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('encrypts home base before storing it', async () => {
    process.env['ENCRYPTION_KEY'] = Buffer.alloc(32, 7).toString('base64');
    const update = vi.fn(async () => ({ id: 'explorer-a' }));
    const prisma = {
      explorer: {
        findFirst: vi.fn(async () => ({ id: 'explorer-a', suspendedAt: null })),
        update,
      },
      auditLog: { create: vi.fn(async () => ({ id: 'audit-a' })) },
    } as unknown as FastifyInstance['prisma'];

    const app = Fastify();
    apps.push(app);
    app.decorate('prisma', prisma);
    await app.register(explorerRoutes);

    const response = await app.inject({
      method: 'PUT',
      url: '/api/explorers/me/home-base',
      headers: { authorization: `Bearer ${createTestToken('explorer-a')}` },
      payload: { lat: 52.2297, lng: 21.0122 },
    });

    expect(response.statusCode, response.body).toBe(200);
    const stored = update.mock.calls[0]?.[0].data.homeBaseEnc as string;
    expect(stored).not.toContain('52.2297');
    expect(stored).not.toContain('21.0122');
    expect(stored.length).toBeGreaterThan(40);
  });

  it('rejects invalid home base coordinates before writing', async () => {
    const update = vi.fn();
    const prisma = {
      explorer: {
        findFirst: vi.fn(async () => ({ id: 'explorer-a', suspendedAt: null })),
        update,
      },
    } as unknown as FastifyInstance['prisma'];

    const app = Fastify();
    apps.push(app);
    app.decorate('prisma', prisma);
    await app.register(explorerRoutes);

    const response = await app.inject({
      method: 'PUT',
      url: '/api/explorers/me/home-base',
      headers: { authorization: `Bearer ${createTestToken('explorer-a')}` },
      payload: { lat: 120, lng: 21 },
    });

    expect(response.statusCode, response.body).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});
