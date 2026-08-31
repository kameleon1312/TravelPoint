-- Sprint 6 migration — apply in Supabase SQL Editor
-- https://supabase.com/dashboard → SQL Editor

-- 1. avatarUrl on Explorer
ALTER TABLE "Explorer"
  ADD COLUMN IF NOT EXISTS "avatarUrl" VARCHAR(500);

-- 2. New SignalType enum values (PostgreSQL requires ALTER TYPE)
ALTER TYPE "SignalType" ADD VALUE IF NOT EXISTS 'NEARBY_SPOT';
ALTER TYPE "SignalType" ADD VALUE IF NOT EXISTS 'SPOT_COMMENT';

-- 3. SpotComment table
CREATE TABLE IF NOT EXISTS "SpotComment" (
  "id"         TEXT          NOT NULL DEFAULT gen_random_uuid()::text,
  "spotId"     TEXT          NOT NULL,
  "explorerId" TEXT          NOT NULL,
  "body"       VARCHAR(500)  NOT NULL,
  "createdAt"  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT "SpotComment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SpotComment_spotId_fkey"
    FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE,
  CONSTRAINT "SpotComment_explorerId_fkey"
    FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "SpotComment_spotId_createdAt_idx"
  ON "SpotComment" ("spotId", "createdAt");

CREATE INDEX IF NOT EXISTS "SpotComment_explorerId_idx"
  ON "SpotComment" ("explorerId");
