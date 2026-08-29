import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;
const __dir = dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: 'postgresql://postgres.doekrkqgsoayovycfizd:Szymon1312!@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    // Try to get JWT secret from Supabase internal config
    let jwtSecret = null;
    try {
      const res = await client.query(`SELECT value FROM vault.secrets WHERE name = 'jwt_secret' LIMIT 1`);
      if (res.rows.length) jwtSecret = res.rows[0].value;
    } catch {}

    try {
      const res = await client.query(`SELECT "jwt_secret" FROM auth.config LIMIT 1`);
      if (res.rows.length) jwtSecret = res.rows[0].jwt_secret;
    } catch {}

    if (jwtSecret) {
      console.log('✅ JWT_SECRET found:', jwtSecret.substring(0, 8) + '...');
    } else {
      console.log('ℹ️  JWT secret not accessible via SQL — provide it manually from Supabase Dashboard → Settings → API → JWT Secret');
    }

    // ── Extensions ────────────────────────────────────────────
    console.log('\n📦 Enabling extensions...');
    await client.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    console.log('  ✅ postgis');

    await client.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    console.log('  ✅ pg_trgm');

    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS pg_cron`);
      console.log('  ✅ pg_cron');
    } catch {
      console.log('  ⚠️  pg_cron not available on this plan — skipping scheduled jobs');
    }

    // ── Spot.location geo trigger ──────────────────────────────
    console.log('\n🌍 Setting up geo trigger...');
    await client.query(`
      CREATE OR REPLACE FUNCTION travelpoint_sync_spot_location()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`DROP TRIGGER IF EXISTS spot_location_sync ON "Spot"`);
    await client.query(`
      CREATE TRIGGER spot_location_sync
        BEFORE INSERT OR UPDATE OF lat, lng ON "Spot"
        FOR EACH ROW
        EXECUTE FUNCTION travelpoint_sync_spot_location();
    `);
    console.log('  ✅ Spot.location auto-sync trigger');

    // Backfill existing rows
    const backfill = await client.query(`
      UPDATE "Spot"
      SET location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
      WHERE location IS NULL AND lat IS NOT NULL AND lng IS NOT NULL
    `);
    console.log(`  ✅ Backfilled ${backfill.rowCount} existing spots`);

    // ── Performance indexes ────────────────────────────────────
    console.log('\n⚡ Creating indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS "Spot_location_gist" ON "Spot" USING GIST (location)`);
    console.log('  ✅ Spot.location GIST (geo proximity)');

    await client.query(`CREATE INDEX IF NOT EXISTS "Explorer_handle_trgm" ON "Explorer" USING GIN (handle gin_trgm_ops)`);
    console.log('  ✅ Explorer.handle trigram (search)');

    await client.query(`CREATE INDEX IF NOT EXISTS "Spot_title_trgm" ON "Spot" USING GIN (title gin_trgm_ops)`);
    console.log('  ✅ Spot.title trigram (search)');

    await client.query(`CREATE INDEX IF NOT EXISTS "Explorer_supabaseId_idx" ON "Explorer" ("supabaseId") WHERE "supabaseId" IS NOT NULL`);
    console.log('  ✅ Explorer.supabaseId partial index');

    await client.query(`CREATE INDEX IF NOT EXISTS "Signal_explorerId_seen_idx" ON "Signal" ("explorerId", "seenAt") WHERE "seenAt" IS NULL`);
    console.log('  ✅ Signal unseen partial index');

    await client.query(`CREATE INDEX IF NOT EXISTS "Spot_accessLevel_deletedAt_idx" ON "Spot" ("accessLevel", "deletedAt") WHERE "deletedAt" IS NULL`);
    console.log('  ✅ Spot active spots index');

    await client.query(`CREATE INDEX IF NOT EXISTS "Explorer_deletedAt_purgeAt_idx" ON "Explorer" ("deletedAt", "purgeAt") WHERE "deletedAt" IS NOT NULL`);
    console.log('  ✅ Explorer pending purge index');

    // ── pg_cron scheduled jobs ─────────────────────────────────
    try {
      await client.query(`SELECT cron.schedule($1, $2, $3)`, [
        'travelpoint-purge-deleted-explorers',
        '0 3 * * *',
        `DELETE FROM "AuditLog" WHERE "explorerId" IN (SELECT id FROM "Explorer" WHERE "purgeAt" < NOW() AND "deletedAt" IS NOT NULL);
         DELETE FROM "Explorer" WHERE "purgeAt" < NOW() AND "deletedAt" IS NOT NULL;`
      ]);
      await client.query(`SELECT cron.schedule($1, $2, $3)`, [
        'travelpoint-cleanup-refresh-tokens',
        '0 * * * *',
        `DELETE FROM "RefreshToken" WHERE "expiresAt" < NOW()`
      ]);
      await client.query(`SELECT cron.schedule($1, $2, $3)`, [
        'travelpoint-cleanup-auth-tokens',
        '30 1 * * *',
        `DELETE FROM "AuthToken" WHERE "expiresAt" < NOW()`
      ]);
      await client.query(`SELECT cron.schedule($1, $2, $3)`, [
        'travelpoint-cleanup-route-data',
        '0 4 * * 0',
        `UPDATE "Journey" SET "routeGeoJson" = NULL
         WHERE "routeExpiresAt" < NOW() AND "retainRoute" = false AND "routeGeoJson" IS NOT NULL`
      ]);
      console.log('\n⏰ Scheduled jobs registered (pg_cron)');
    } catch {
      console.log('\n⚠️  pg_cron not available — scheduled cleanup must be handled externally');
    }

    // ── Drop conflicting Supabase default trigger ──────────────
    // on_auth_user_created calls handle_new_user() to insert into public.profiles.
    // TravelPoint uses /api/auth/complete-signup instead — drop both to unblock signUp.
    console.log('\n🔧 Removing conflicting Supabase auth trigger...');
    try {
      await client.query(`DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users`);
      await client.query(`DROP FUNCTION IF EXISTS public.handle_new_user()`);
      console.log('  ✅ on_auth_user_created trigger removed (or was already absent)');
    } catch (e) {
      console.log('  ⚠️  Could not drop auth trigger — run fix-auth-trigger.sql manually in SQL Editor:', e.message);
    }

    // ── RLS — disabled intentionally ──────────────────────────
    // All access goes through Fastify (requireAuth middleware).
    // PostgREST direct access is not used.
    console.log('\n🔒 RLS: intentionally disabled (all access via Fastify middleware)');

    console.log('\n✅ Supabase database setup complete!\n');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
