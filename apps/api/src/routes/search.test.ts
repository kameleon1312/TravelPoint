import Fastify from 'fastify';
import type { Prisma } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestToken } from '../lib/testHelpers';
import { searchRoutes } from './search';

describe('GET /api/search spot privacy', () => {
  const apps: FastifyInstance[] = [];
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  async function spotSearchSql(rank: string): Promise<Prisma.Sql> {
    const queryRaw = vi.fn(async () => []);
    const prisma = {
      explorer: {
        findFirst: vi.fn(async () => ({ id: 'viewer', suspendedAt: null })),
        findUnique: vi.fn(async () => ({ rank })),
      },
      $queryRaw: queryRaw,
    } as unknown as FastifyInstance['prisma'];
    const app = Fastify();
    apps.push(app);
    app.decorate('prisma', prisma);
    await app.register(searchRoutes);
    const res = await app.inject({
      method: 'GET',
      url: '/api/search?q=klucz&type=spots',
      headers: { authorization: `Bearer ${createTestToken('viewer')}` },
    });
    expect(res.statusCode).toBe(200);
    return (queryRaw.mock.calls[0] as unknown as [Prisma.Sql])[0];
  }

  it('lets low-rank explorers match story text of PUBLIC spots only', async () => {
    const sql = await spotSearchSql('NEWCOMER');
    expect(sql.sql).toContain('(story ILIKE ? AND "accessLevel"::text IN (?))');
    expect(sql.values).toContain('PUBLIC');
    expect(sql.values).not.toContain('TRUSTED');
    expect(sql.values).not.toContain('SECRET_DROP');
  });

  it('extends story matching to levels the explorer can unlock', async () => {
    const sql = await spotSearchSql('INSIDER');
    expect(sql.values).toEqual(expect.arrayContaining(['PUBLIC', 'TRUSTED', 'SECRET_DROP']));
  });

  it('excludes expired secret drops from discovery', async () => {
    const sql = await spotSearchSql('LEGEND');
    expect(sql.sql).toContain(`NOT ("accessLevel"::text = 'SECRET_DROP' AND ("dropExpiresAt" IS NULL OR "dropExpiresAt" <= NOW()))`);
  });
});
