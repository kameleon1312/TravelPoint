import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/requireAuth';

export async function explorerRoutes(app: FastifyInstance) {
  // GET /api/explorers/me
  app.get('/api/explorers/me', { preHandler: [requireAuth] }, async (req, reply) => {
    const explorer = await app.prisma.explorer.findUnique({
      where: { id: req.explorerId },
      select: {
        id: true, handle: true, displayName: true, archetype: true,
        bio: true, obsessions: true, trustScore: true, rank: true,
        tier: true, tierExpiresAt: true, emailVerified: true,
        locationConsent: true, presenceConsent: true, createdAt: true,
      },
    });
    if (!explorer) return reply.status(404).send({ code: 'NOT_FOUND' });
    return reply.send(explorer);
  });

  // PATCH /api/explorers/me
  app.patch('/api/explorers/me', { preHandler: [requireAuth] }, async (req, reply) => {
    const body = req.body as Record<string, unknown>;
    const allowed = ['displayName', 'bio', 'obsessions', 'archetype'];
    const data = Object.fromEntries(
      Object.entries(body).filter(([k]) => allowed.includes(k)),
    );
    const explorer = await app.prisma.explorer.update({
      where: { id: req.explorerId },
      data,
      select: { id: true, handle: true, displayName: true, bio: true, obsessions: true, archetype: true },
    });
    return reply.send(explorer);
  });

  // DELETE /api/explorers/me — RODO right to erasure (soft delete, purge in 30d)
  app.delete('/api/explorers/me', { preHandler: [requireAuth] }, async (req, reply) => {
    await app.prisma.explorer.update({
      where: { id: req.explorerId },
      data: { deletedAt: new Date(), email: `deleted_${req.explorerId}@travelpoint.deleted` },
    });
    await app.prisma.refreshToken.updateMany({
      where: { explorerId: req.explorerId },
      data: { revokedAt: new Date() },
    });
    return reply.status(204).send();
  });

  // GET /api/explorers/me/export — RODO data portability
  app.get('/api/explorers/me/export', { preHandler: [requireAuth] }, async (req, reply) => {
    const [explorer, spots, journeys] = await Promise.all([
      app.prisma.explorer.findUnique({ where: { id: req.explorerId } }),
      app.prisma.spot.findMany({ where: { ownerId: req.explorerId } }),
      app.prisma.journey.findMany({ where: { explorerId: req.explorerId } }),
    ]);
    return reply.send({ explorer, spots, journeys, exportedAt: new Date() });
  });

  // GET /api/explorers/:handle — public profile
  app.get('/api/explorers/:handle', async (req, reply) => {
    const { handle } = req.params as { handle: string };
    const explorer = await app.prisma.explorer.findUnique({
      where: { handle },
      select: { id: true, handle: true, displayName: true, archetype: true, bio: true, obsessions: true, rank: true },
    });
    if (!explorer) return reply.status(404).send({ code: 'NOT_FOUND' });
    return reply.send(explorer);
  });
}
