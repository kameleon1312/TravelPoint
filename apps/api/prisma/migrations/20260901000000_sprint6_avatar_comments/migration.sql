-- avatarUrl on Explorer (idempotent)
ALTER TABLE "Explorer"
  ADD COLUMN IF NOT EXISTS "avatarUrl" VARCHAR(500);

-- New SignalType enum values (IF NOT EXISTS prevents duplicate-value errors)
DO $$ BEGIN
  ALTER TYPE "SignalType" ADD VALUE IF NOT EXISTS 'NEARBY_SPOT';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "SignalType" ADD VALUE IF NOT EXISTS 'SPOT_COMMENT';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- SpotComment table (idempotent)
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
