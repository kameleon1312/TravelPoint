import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { requireAuth } from '../middleware/requireAuth';
import type {
  SpotSearchResult,
  ExplorerSearchResult,
  JourneySearchResult,
  Rank,
  Archetype,
} from '@travelpoint/types';

const RATE_LIMIT = { max: 30, timeWindow: '1 minute' };

// ── Access level thresholds ───────────────────────────────────────────────────
const RANK_ORDER: Record<string, number> = {
  NEWCOMER: 0, EXPLORER: 1, TRUSTED: 2, INSIDER: 3, LEGEND: 4,
};

function explorerCanSeeAccess(rank: string, accessLevel: string): boolean {
  if (accessLevel === 'PUBLIC') return true;
  const r = RANK_ORDER[rank] ?? -1;
  if (accessLevel === 'TRUSTED') return r >= (RANK_ORDER['TRUSTED'] ?? 0);
  if (accessLevel === 'SECRET_DROP') return r >= (RANK_ORDER['INSIDER'] ?? 0);
  return false; // CIRCLE_ONLY excluded from global search
}

// ── Spot search ───────────────────────────────────────────────────────────────
async function searchSpots(
  app: FastifyInstance,
  q: string,
  limit: number,
  explorerRank: string,
): Promise<SpotSearchResult[]> {
  type RawRow = {
    id: string;
    title: string;
    category: string;
    accessLevel: string;
  };

  let rows: RawRow[] = [];

  try {
    rows = await app.prisma.$queryRaw<RawRow[]>(Prisma.sql`
      SELECT id, title, category::text, "accessLevel"::text
      FROM "Spot"
      WHERE "deletedAt" IS NULL
        AND "accessLevel"::text != 'CIRCLE_ONLY'
        AND (
          title % ${q}
          OR title ILIKE ${`%${q}%`}
          OR story ILIKE ${`%${q}%`}
        )
      ORDER BY similarity(title, ${q}) DESC, "createdAt" DESC
      LIMIT ${limit * 2}
    `);
  } catch {
    // pg_trgm not available — fallback to plain LIKE
    rows = await app.prisma.$queryRaw<RawRow[]>(Prisma.sql`
      SELECT id, title, category::text, "accessLevel"::text
      FROM "Spot"
      WHERE "deletedAt" IS NULL
        AND "accessLevel"::text != 'CIRCLE_ONLY'
        AND (
          title ILIKE ${`%${q}%`}
          OR story ILIKE ${`%${q}%`}
        )
      ORDER BY "createdAt" DESC
      LIMIT ${limit * 2}
    `);
  }

  return rows
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category as SpotSearchResult['category'],
      accessLevel: row.accessLevel as SpotSearchResult['accessLevel'],
      locked: !explorerCanSeeAccess(explorerRank, row.accessLevel),
    }));
}

// ── Explorer search ───────────────────────────────────────────────────────────
async function searchExplorers(
  app: FastifyInstance,
  q: string,
  limit: number,
  selfId: string,
): Promise<ExplorerSearchResult[]> {
  type RawRow = {
    id: string;
    handle: string;
    displayName: string | null;
    rank: string;
    archetype: string;
    avatarUrl: string | null;
  };

  let rows: RawRow[] = [];

  try {
    rows = await app.prisma.$queryRaw<RawRow[]>(Prisma.sql`
      SELECT id, handle, "displayName", rank::text, archetype::text, "avatarUrl"
      FROM "Explorer"
      WHERE "deletedAt" IS NULL
        AND id != ${selfId}
        AND (
          handle % ${q}
          OR handle ILIKE ${`%${q}%`}
          OR "displayName" ILIKE ${`%${q}%`}
        )
      ORDER BY similarity(handle, ${q}) DESC
      LIMIT ${limit}
    `);
  } catch {
    rows = await app.prisma.$queryRaw<RawRow[]>(Prisma.sql`
      SELECT id, handle, "displayName", rank::text, archetype::text, "avatarUrl"
      FROM "Explorer"
      WHERE "deletedAt" IS NULL
        AND id != ${selfId}
        AND (
          handle ILIKE ${`%${q}%`}
          OR "displayName" ILIKE ${`%${q}%`}
        )
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `);
  }

  return rows.map((row) => ({
    id:          row.id,
    handle:      row.handle,
    displayName: row.displayName ?? undefined,
    rank:        row.rank as Rank,
    archetype:   row.archetype as Archetype,
    avatarUrl:   row.avatarUrl ?? undefined,
  }));
}

// ── Journey search ────────────────────────────────────────────────────────────
async function searchJourneys(
  app: FastifyInstance,
  q: string,
  limit: number,
  selfId: string,
): Promise<JourneySearchResult[]> {
  type RawRow = {
    id: string;
    title: string;
    isPrivate: boolean;
    createdAt: Date;
    explorerId: string;
    handle: string;
    rank: string;
  };

  let rows: RawRow[] = [];

  try {
    rows = await app.prisma.$queryRaw<RawRow[]>(Prisma.sql`
      SELECT j.id, j.title, j."isPrivate", j."createdAt", j."explorerId",
             e.handle, e.rank::text AS rank
      FROM "Journey" j
      JOIN "Explorer" e ON e.id = j."explorerId"
      WHERE j."deletedAt" IS NULL
        AND (j."isPrivate" = false OR j."explorerId" = ${selfId})
        AND (
          j.title % ${q}
          OR j.title ILIKE ${`%${q}%`}
        )
      ORDER BY similarity(j.title, ${q}) DESC, j."createdAt" DESC
      LIMIT ${limit}
    `);
  } catch {
    rows = await app.prisma.$queryRaw<RawRow[]>(Prisma.sql`
      SELECT j.id, j.title, j."isPrivate", j."createdAt", j."explorerId",
             e.handle, e.rank::text AS rank
      FROM "Journey" j
      JOIN "Explorer" e ON e.id = j."explorerId"
      WHERE j."deletedAt" IS NULL
        AND (j."isPrivate" = false OR j."explorerId" = ${selfId})
        AND j.title ILIKE ${`%${q}%`}
      ORDER BY j."createdAt" DESC
      LIMIT ${limit}
    `);
  }

  return rows.map((row) => ({
    id:        row.id,
    title:     row.title,
    isPrivate: row.isPrivate,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    explorer:  { id: row.explorerId, handle: row.handle, rank: row.rank as Rank },
  }));
}

// ── Route registration ────────────────────────────────────────────────────────
export async function searchRoutes(app: FastifyInstance) {
  app.get(
    '/api/search',
    { preHandler: [requireAuth], config: { rateLimit: RATE_LIMIT } },
    async (req, reply) => {
      const query  = req.query as { q?: string; type?: string; limit?: string };
      const q      = (query.q ?? '').trim().slice(0, 100);
      if (q.length < 2) {
        return reply.status(400).send({ code: 'QUERY_TOO_SHORT', message: 'Minimum 2 znaki' });
      }

      const type  = (['spots', 'explorers', 'journeys'] as const).includes(query.type as never)
        ? (query.type as 'spots' | 'explorers' | 'journeys')
        : 'all';
      const limit = Math.min(Math.max(parseInt(query.limit ?? '8', 10) || 8, 1), 20);

      const explorer = await app.prisma.explorer.findUnique({
        where: { id: req.explorerId },
        select: { rank: true },
      });
      const rank = explorer?.rank ?? 'NEWCOMER';

      const [spots, explorers, journeys] = await Promise.all([
        type === 'all' || type === 'spots'
          ? searchSpots(app, q, limit, rank)
          : ([] as SpotSearchResult[]),
        type === 'all' || type === 'explorers'
          ? searchExplorers(app, q, limit, req.explorerId)
          : ([] as ExplorerSearchResult[]),
        type === 'all' || type === 'journeys'
          ? searchJourneys(app, q, limit, req.explorerId)
          : ([] as JourneySearchResult[]),
      ]);

      return reply.send({ spots, explorers, journeys });
    },
  );
}
