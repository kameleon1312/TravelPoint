import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestToken } from '../lib/testHelpers';

vi.mock('../services/trustScore', () => ({
  addTrustPoints: vi.fn(async () => {}),
  TrustPoints: { JOURNEY_PUBLISHED: 8 },
}));
vi.mock('../services/push', () => ({ sendPushToExplorer: vi.fn(async () => {}) }));

const { journeyRoutes } = await import('./journeys');

const line = Array.from({ length: 31 }, (_, i) => [19.9, 50.0 + i * 0.001]);
const journeyRow = {
  id: 'j1',
  explorerId: 'author',
  title: 'Coastline',
  isPrivate: false,
  routeGeoJson: {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: line }, properties: null }],
  },
  _count: { likes: 0 },
};

describe('journey routes', () => {
  const apps: FastifyInstance[] = [];
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  async function build(viewerId: string, extra: { blocked?: boolean; tier?: string; owned?: number } = {}) {
    const journeyCreate = vi.fn(async () => ({ id: 'new' }));
    const prisma = {
      explorer: {
        findFirst: vi.fn(async () => ({ id: viewerId, suspendedAt: null })),
        findUnique: vi.fn(async () => ({ tier: extra.tier ?? 'FREE' })),
      },
      journey: {
        findUnique: vi.fn(async () => journeyRow),
        count: vi.fn(async () => extra.owned ?? 0),
        create: journeyCreate,
      },
      journeyLike: { findUnique: vi.fn(async () => null) },
      block: { findFirst: vi.fn(async () => (extra.blocked ? { blockerId: 'author' } : null)) },
      auditLog: { create: vi.fn(async () => ({})) },
    } as unknown as FastifyInstance['prisma'];
    const app = Fastify();
    apps.push(app);
    app.decorate('prisma', prisma);
    await app.register(journeyRoutes);
    const inject = (method: 'GET' | 'POST', url: string, payload?: object) =>
      app.inject({ method, url, payload, headers: { authorization: `Bearer ${createTestToken(viewerId)}` } });
    return { inject, journeyCreate };
  }

  function coords(body: { routeGeoJson: { features: Array<{ geometry: { coordinates: number[][] } }> } | null }) {
    return body.routeGeoJson?.features[0]?.geometry.coordinates ?? [];
  }

  it('gives the author the full GPS trail', async () => {
    const { inject } = await build('author');
    const res = await inject('GET', '/api/journeys/j1');
    expect(coords(res.json())).toHaveLength(31);
  });

  it('trims the start and end of the trail for other explorers', async () => {
    const { inject } = await build('viewer');
    const trail = coords((await inject('GET', '/api/journeys/j1')).json());
    expect(trail.length).toBeGreaterThan(0);
    expect(trail.length).toBeLessThan(31);
    expect(trail[0]).not.toEqual(line[0]);
    expect(trail[trail.length - 1]).not.toEqual(line[30]);
  });

  it('hides journeys across a block', async () => {
    const { inject } = await build('viewer', { blocked: true });
    expect((await inject('GET', '/api/journeys/j1')).statusCode).toBe(404);
  });

  it('enforces the FREE journey limit and lets PRO create more', async () => {
    const free = await build('viewer', { tier: 'FREE', owned: 3 });
    const blocked = await free.inject('POST', '/api/journeys', { title: 'Fourth' });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json()).toMatchObject({ code: 'TIER_LIMIT' });
    expect(free.journeyCreate).not.toHaveBeenCalled();

    const pro = await build('viewer', { tier: 'PRO', owned: 30 });
    expect((await pro.inject('POST', '/api/journeys', { title: 'Many' })).statusCode).toBe(201);
  });
});
