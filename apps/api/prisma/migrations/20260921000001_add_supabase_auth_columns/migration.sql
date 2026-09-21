-- Add supabaseId to Explorer for Supabase Auth integration
-- This column was present in schema.prisma but missing from all migrations.
ALTER TABLE "Explorer" ADD COLUMN IF NOT EXISTS "supabaseId" TEXT;

-- Make passwordHash nullable (app uses Supabase Auth, local hash is no longer required)
ALTER TABLE "Explorer" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Unique constraint and index on supabaseId
CREATE UNIQUE INDEX IF NOT EXISTS "Explorer_supabaseId_key" ON "Explorer"("supabaseId");
CREATE INDEX IF NOT EXISTS "Explorer_supabaseId_idx" ON "Explorer"("supabaseId");
