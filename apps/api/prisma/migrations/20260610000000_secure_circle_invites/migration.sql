-- Sprint 1 security: scope invite codes and make their consumption auditable.

CREATE TYPE "InvitePurpose" AS ENUM ('ACCOUNT', 'CIRCLE');

ALTER TABLE "InviteCode"
  ADD COLUMN "purpose" "InvitePurpose" NOT NULL DEFAULT 'ACCOUNT',
  ADD COLUMN "circleId" TEXT,
  ADD COLUMN "maxUses" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "useCount" INTEGER NOT NULL DEFAULT 0;

-- Preserve the meaning of legacy, already-used account invitations.
UPDATE "InviteCode"
SET "useCount" = 1
WHERE "usedAt" IS NOT NULL;

-- Old code briefly used a sentinel value while registering. Remove any
-- non-relational values before enforcing foreign keys.
UPDATE "InviteCode" AS invite
SET "usedById" = NULL
WHERE "usedById" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Explorer" AS explorer WHERE explorer."id" = invite."usedById"
  );

DELETE FROM "InviteCode" AS invite
WHERE NOT EXISTS (
  SELECT 1 FROM "Explorer" AS explorer WHERE explorer."id" = invite."createdById"
);

ALTER TABLE "InviteCode"
  ADD CONSTRAINT "InviteCode_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "Explorer"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "InviteCode_usedById_fkey"
    FOREIGN KEY ("usedById") REFERENCES "Explorer"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "InviteCode_circleId_fkey"
    FOREIGN KEY ("circleId") REFERENCES "Circle"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "InviteCode_positive_max_uses"
    CHECK ("maxUses" > 0),
  ADD CONSTRAINT "InviteCode_valid_use_count"
    CHECK ("useCount" >= 0 AND "useCount" <= "maxUses"),
  ADD CONSTRAINT "InviteCode_purpose_scope"
    CHECK (
      ("purpose" = 'ACCOUNT' AND "circleId" IS NULL)
      OR
      ("purpose" = 'CIRCLE' AND "circleId" IS NOT NULL)
    );

CREATE INDEX "InviteCode_createdById_idx" ON "InviteCode"("createdById");
CREATE INDEX "InviteCode_circleId_idx" ON "InviteCode"("circleId");
CREATE INDEX "InviteCode_purpose_expiresAt_idx" ON "InviteCode"("purpose", "expiresAt");
