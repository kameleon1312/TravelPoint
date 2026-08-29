-- ============================================================
-- TravelPoint — Supabase Setup SQL
-- Status: EXECUTED (run via run-setup.mjs, 2026-08-15)
-- Uruchom w: Supabase Dashboard → SQL Editor (jeśli potrzeba restartu)
-- ============================================================

-- 1. Rozszerzenia
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_cron;  -- dostępne na Pro planie

-- 2. Trigger: auto-sync Spot.location z lat/lng
CREATE OR REPLACE FUNCTION travelpoint_sync_spot_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS spot_location_sync ON "Spot";
CREATE TRIGGER spot_location_sync
  BEFORE INSERT OR UPDATE OF lat, lng ON "Spot"
  FOR EACH ROW
  EXECUTE FUNCTION travelpoint_sync_spot_location();

-- Backfill istniejących spotów
UPDATE "Spot"
SET location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
WHERE location IS NULL AND lat IS NOT NULL AND lng IS NOT NULL;

-- 3. Indeksy wydajności
CREATE INDEX IF NOT EXISTS "Spot_location_gist"         ON "Spot"     USING GIST (location);
CREATE INDEX IF NOT EXISTS "Explorer_handle_trgm"       ON "Explorer" USING GIN  (handle gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Spot_title_trgm"            ON "Spot"     USING GIN  (title  gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Explorer_supabaseId_idx"    ON "Explorer" ("supabaseId") WHERE "supabaseId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Signal_unseen_idx"          ON "Signal"   ("explorerId", "seenAt") WHERE "seenAt" IS NULL;
CREATE INDEX IF NOT EXISTS "Spot_active_idx"            ON "Spot"     ("accessLevel", "deletedAt") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "Explorer_purge_idx"         ON "Explorer" ("deletedAt", "purgeAt") WHERE "deletedAt" IS NOT NULL;

-- 4. pg_cron — zaplanowane sprzątanie (Pro plan)
SELECT cron.schedule('travelpoint-purge-deleted-explorers', '0 3 * * *',
  $$ DELETE FROM "Explorer" WHERE "purgeAt" < NOW() AND "deletedAt" IS NOT NULL $$);

SELECT cron.schedule('travelpoint-cleanup-refresh-tokens', '0 * * * *',
  $$ DELETE FROM "RefreshToken" WHERE "expiresAt" < NOW() $$);

SELECT cron.schedule('travelpoint-cleanup-auth-tokens', '30 1 * * *',
  $$ DELETE FROM "AuthToken" WHERE "expiresAt" < NOW() $$);

SELECT cron.schedule('travelpoint-cleanup-route-data', '0 4 * * 0',
  $$ UPDATE "Journey" SET "routeGeoJson" = NULL
     WHERE "routeExpiresAt" < NOW() AND "retainRoute" = false AND "routeGeoJson" IS NOT NULL $$);

-- 5. RLS — WYŁĄCZONE intencjonalnie.
--    Cały dostęp idzie przez Fastify API z requireAuth middleware.
--    Hidden Layer (geo-privacy) wymuszany server-side.
--    Direct PostgREST access nie jest używany.

-- 6. Email confirmations
--    Authentication → Email → "Enable email confirmations" → OFF (dev)
--    LUB zostaw włączone — join.tsx obsługuje oba przypadki.
