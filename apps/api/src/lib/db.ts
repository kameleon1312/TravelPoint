import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

export function createPool(url = env.databaseUrl): pg.Pool {
  if (!url) {
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
    const parsedUrl = new URL(url);
    const sslMode = parsedUrl.searchParams.get('sslmode');
    const ssl = sslMode === 'require' || sslMode === 'prefer' || sslMode === 'no-verify'
      ? { rejectUnauthorized: false }
      : false;
    parsedUrl.searchParams.delete('sslmode');

    return new pg.Pool({
      connectionString: parsedUrl.toString(),
      ssl,
    });
  } catch (error) {
    throw new Error('DATABASE_URL is not a valid PostgreSQL URL', { cause: error });
  }
}

export function createPrismaClient(pool: pg.Pool): PrismaClient {
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}
