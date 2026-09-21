/**
 * ensure-db.mjs — idempotent pre-migration guard for Render / Railway / any cold-start.
 *
 * Handles three states before handing off to `prisma migrate deploy`:
 *
 *   A. _prisma_migrations missing — create it (prevents P3005)
 *   B. Failed / in-progress rows (finished_at IS NULL) — delete them (prevents P3009)
 *   C. Table exists but empty + app tables already present — baseline all migrations
 *      so `migrate deploy` skips them instead of trying to re-create existing tables
 */
import pg from 'pg';
import { readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env['DATABASE_URL'], max: 1 });
const client = await pool.connect();

async function tableExists(name) {
  const r = await client.query(
    `SELECT EXISTS(
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS e`,
    [name],
  );
  return r.rows[0].e === true;
}

async function getMigrationNames() {
  const dir = resolve(ROOT, 'prisma', 'migrations');
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory() && /^\d{14}_/.test(e.name))
    .map(e => e.name)
    .sort();
}

try {
  // ── A. Ensure _prisma_migrations table exists ────────────────────────────────
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

  // ── B. Remove failed/in-progress rows (finished_at IS NULL, not rolled back) ─
  const { rowCount: failed } = await client.query(`
    DELETE FROM "_prisma_migrations"
    WHERE finished_at IS NULL AND rolled_back_at IS NULL
  `);
  if (failed > 0) {
    console.log(`[ensure-db] Removed ${failed} failed migration row(s) — clearing P3009`);
  }

  // ── C. Baseline if app tables exist but migration history is empty ────────────
  const appExists = await tableExists('Explorer');
  const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM "_prisma_migrations"`);
  const appliedCount = rows[0].n;

  if (appExists && appliedCount === 0) {
    console.log('[ensure-db] App tables exist but no migration history — baselining all migrations');
    const names = await getMigrationNames();
    for (const name of names) {
      await client.query(
        `INSERT INTO "_prisma_migrations"
           (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
         VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
        [crypto.randomUUID(), '0'.repeat(64), name],
      );
      console.log(`[ensure-db]   baselined: ${name}`);
    }
  }

  // ── D. Ensure critical schema additions always exist ─────────────────────
  // Scenario C baselines migrations without running their SQL, so columns and
  // enum values added by later migrations can silently disappear after a DB reset.
  // Every statement uses IF NOT EXISTS / DO-EXCEPTION guards — safe no-ops.
  if (appExists) {
    // supabaseId column + indexes (from 20260921000001_add_supabase_auth_columns)
    await client.query(`ALTER TABLE "Explorer" ADD COLUMN IF NOT EXISTS "supabaseId" TEXT`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Explorer_supabaseId_key" ON "Explorer"("supabaseId")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Explorer_supabaseId_idx" ON "Explorer"("supabaseId")`);
    // passwordHash must be nullable so Supabase-only users can register
    await client.query(`ALTER TABLE "Explorer" ALTER COLUMN "passwordHash" DROP NOT NULL`);

    // SignalType enum values added across multiple migrations
    for (const val of ['NEARBY_SPOT', 'SPOT_COMMENT', 'FORUM_REPLY', 'RANK_UP']) {
      await client.query(
        `DO $$ BEGIN ALTER TYPE "SignalType" ADD VALUE IF NOT EXISTS '${val}'; EXCEPTION WHEN duplicate_object THEN NULL; END $$`
      );
    }

    console.log('[ensure-db] schema additions verified');
  }

  console.log('[ensure-db] Ready');
} finally {
  client.release();
  await pool.end();
}

execSync('npx prisma migrate deploy --schema=prisma/schema.prisma', {
  stdio: 'inherit',
  cwd: ROOT,
});
