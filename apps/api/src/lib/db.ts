import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

export function createPool(): pg.Pool {
  const url = (process.env['DATABASE_URL'] ?? '').trim();

  if (!url) {
    // Fallback to individual env vars or defaults for local Docker
    return new pg.Pool({
      host: '127.0.0.1',
      port: 5432,
      user: 'postgres',
      password: 'dev',
      database: 'travelpoint',
      ssl: false,
    });
  }

  try {
    const u = new URL(url);
    return new pg.Pool({
      host: u.hostname,
      port: Number(u.port) || 5432,
      user: decodeURIComponent(u.username) || 'postgres',
      password: decodeURIComponent(u.password) || 'dev',
      database: u.pathname.replace(/^\//, '') || 'travelpoint',
      ssl: false,
    });
  } catch {
    // URL parse failed — use defaults
    return new pg.Pool({
      host: '127.0.0.1',
      port: 5432,
      user: 'postgres',
      password: 'dev',
      database: 'travelpoint',
      ssl: false,
    });
  }
}

export function createPrismaClient(pool: pg.Pool): PrismaClient {
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}
