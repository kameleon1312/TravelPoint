/**
 * ensure-db.mjs
 * Creates _prisma_migrations table if it doesn't exist, then hands off to
 * `prisma migrate deploy`. Prevents Prisma P3005 on Render/fresh environments
 * where PostGIS/Supabase objects exist in public schema but migration table is missing.
 */
import pg from 'pg';
import { execSync } from 'node:child_process';

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env['DATABASE_URL'], max: 1 });

const client = await pool.connect();
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      id                   VARCHAR(36)  PRIMARY KEY,
      checksum             VARCHAR(64)  NOT NULL,
      finished_at          TIMESTAMPTZ,
      migration_name       VARCHAR(255) NOT NULL,
      logs                 TEXT,
      rolled_back_at       TIMESTAMPTZ,
      started_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
      applied_steps_count  INTEGER      NOT NULL DEFAULT 0
    )
  `);
  console.log('[ensure-db] _prisma_migrations ready');
} finally {
  client.release();
  await pool.end();
}

execSync('npx prisma migrate deploy --schema=prisma/schema.prisma', {
  stdio: 'inherit',
  cwd: process.cwd(),
});
