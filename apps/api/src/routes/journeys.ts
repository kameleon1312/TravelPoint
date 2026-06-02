import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { CreateJourneySchema, UpdateJourneySchema } from '@travelpoint/validation';
import { requireAuth } from '../middleware/requireAuth';
import { addTrustPoints, TrustPoints } from '../services/trustScore';

export async function journeyRoutes(app: FastifyInstance) {
  // GET /api/journeys/me — own journeys
  app.get('/api/journeys/me', { preHandler: [requireAuth] }, async (req, reply) => {
    const journeys = await app.prisma.journey.findMany({
      where: { explorerId: req.explorerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, mood: true, soundtrack: true,
        isPrivate: true, createdAt: true, updatedAt: true,
        // routeGeoJson excluded — only returned on single fetch
      },
    });
    return reply.send(journeys);
  });

  // GET /api/journeys/:id
  app.get('/api/journeys/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const journey = await app.prisma.journey.findUnique({ where: { id } });
    if (!journey) return reply.status(404).send({ code: 'NOT_FOUND' });

    // Private journeys only visible to owner
    if (journey.isPrivate && journey.explorerId !== req.explorerId) {
      return reply.status(403).send({ code: 'FORBIDDEN' });
    }
    return reply.send(journey);
  });

  // POST /api/journeys
  app.post('/api/journeys', { preHandler: [requireAuth] }, async (req, reply) => {
    const parsed = CreateJourneySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }
    const journey = await app.prisma.journey.create({
      data: { ...parsed.data, explorerId: req.explorerId },
    });

    await app.prisma.auditLog.create({
      data: { explorerId: req.explorerId, action: 'JOURNEY_CREATED', metadata: { journeyId: journey.id } },
    });

    if (!parsed.data.isPrivate) {
      void addTrustPoints(app.prisma, req.explorerId, TrustPoints.JOURNEY_PUBLISHED);
    }

    return reply.status(201).send(journey);
  });

  // PATCH /api/journeys/:id — bodyLimit raised for routeGeoJson (GPS traces can be large)
  app.patch('/api/journeys/:id', { preHandler: [requireAuth], bodyLimit: 2 * 1024 * 1024 }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = UpdateJourneySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    }

    const existing = await app.prisma.journey.findUnique({ where: { id } });
    if (!existing || existing.explorerId !== req.explorerId) {
      return reply.status(403).send({ code: 'FORBIDDEN' });
    }

    // Prisma Json fields require InputJsonValue — routeGeoJson is typed GeoJSON,
    // so we cast it explicitly while keeping other fields strongly typed.
    const { routeGeoJson, ...rest } = parsed.data;
    const journey = await app.prisma.journey.update({
      where: { id },
      data: {
        ...rest,
        ...(routeGeoJson !== undefined
          ? { routeGeoJson: routeGeoJson as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });
    return reply.send(journey);
  });

  // DELETE /api/journeys/:id
  app.delete('/api/journeys/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await app.prisma.journey.findUnique({ where: { id } });
    if (!existing || existing.explorerId !== req.explorerId) {
      return reply.status(403).send({ code: 'FORBIDDEN' });
    }
    await app.prisma.journey.delete({ where: { id } });
    return reply.status(204).send();
  });

  // GET /api/explorers/:handle/journeys — public journeys of an explorer
  app.get('/api/explorers/:handle/journeys', { preHandler: [requireAuth] }, async (req, reply) => {
    const { handle } = req.params as { handle: string };
    const explorer = await app.prisma.explorer.findUnique({
      where: { handle },
      select: { id: true },
    });
    if (!explorer) return reply.status(404).send({ code: 'NOT_FOUND' });

    const journeys = await app.prisma.journey.findMany({
      where: { explorerId: explorer.id, isPrivate: false },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, mood: true, soundtrack: true, createdAt: true },
    });
    return reply.send(journeys);
  });
}
