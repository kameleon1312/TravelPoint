-- Add territories array to Explorer (Explorer archetype system extension)
ALTER TABLE "Explorer" ADD COLUMN IF NOT EXISTS "territories" TEXT[] NOT NULL DEFAULT '{}';
