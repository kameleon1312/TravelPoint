-- CreateEnum
CREATE TYPE "AccountRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "AuthTokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "TrustEventType" AS ENUM ('SPOT_CREATED', 'PHOTO_ADDED', 'SPOT_VERIFIED', 'REACTION_RECEIVED', 'INVITE_JOINED', 'JOURNEY_PUBLISHED', 'WEEK_ACTIVE', 'MODERATION_PENALTY');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'INSIGHTFUL', 'HIDDEN_GEM');

-- CreateEnum
CREATE TYPE "VerificationDecision" AS ENUM ('CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SAFETY', 'HARASSMENT', 'SPAM', 'ILLEGAL_CONTENT', 'PRIVACY', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ModerationActionType" AS ENUM ('SUSPEND', 'UNSUSPEND', 'DELETE_CONTENT', 'WARN', 'RESOLVE_REPORT');

-- DropForeignKey
ALTER TABLE "Photo" DROP CONSTRAINT "Photo_uploaderId_fkey";

-- DropForeignKey
ALTER TABLE "Transmission" DROP CONSTRAINT "Transmission_senderId_fkey";

-- AlterTable
ALTER TABLE "Circle" ADD COLUMN     "createdById" TEXT;

UPDATE "Circle" AS circle
SET "createdById" = founder."explorerId"
FROM (
    SELECT DISTINCT ON ("circleId") "circleId", "explorerId"
    FROM "CircleMember"
    WHERE "role" = 'FOUNDER'
    ORDER BY "circleId", "joinedAt" ASC
) AS founder
WHERE circle."id" = founder."circleId";

-- AlterTable
ALTER TABLE "Explorer" ADD COLUMN     "purgeAt" TIMESTAMP(3),
ADD COLUMN     "role" "AccountRole" NOT NULL DEFAULT 'USER',
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" VARCHAR(500);

-- AlterTable
ALTER TABLE "Journey" ADD COLUMN     "retainRoute" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "routeExpiresAt" TIMESTAMP(3);

UPDATE "Journey"
SET "routeExpiresAt" = "createdAt" + INTERVAL '90 days'
WHERE "routeGeoJson" IS NOT NULL;

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "mimeType" VARCHAR(100),
ADD COLUMN     "objectKey" TEXT,
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "thumbnailKey" TEXT,
ADD COLUMN     "thumbnailUrl" TEXT;

-- AlterTable
ALTER TABLE "Signal" ADD COLUMN     "dedupeKey" TEXT;

-- CreateTable
CREATE TABLE "JourneyLike" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "explorerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteUse" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "explorerId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteUse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "explorerId" TEXT NOT NULL,
    "type" "AuthTokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustEvent" (
    "id" TEXT NOT NULL,
    "explorerId" TEXT NOT NULL,
    "type" "TrustEventType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "scoreAfter" INTEGER NOT NULL,
    "rankAfter" "Rank" NOT NULL,
    "referenceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TierEvent" (
    "id" TEXT NOT NULL,
    "explorerId" TEXT NOT NULL,
    "fromTier" "Tier",
    "toTier" "Tier" NOT NULL,
    "reason" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TierEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "explorerId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpotVerification" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "explorerId" TEXT NOT NULL,
    "decision" "VerificationDecision" NOT NULL,
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpotVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetExplorerId" TEXT,
    "spotId" TEXT,
    "transmissionId" TEXT,
    "reason" "ReportReason" NOT NULL,
    "details" VARCHAR(1000),
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" VARCHAR(1000),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationAction" (
    "id" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "targetExplorerId" TEXT,
    "reportId" TEXT,
    "type" "ModerationActionType" NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

DELETE FROM "Transmission"
WHERE "recipientId" IS NULL AND "circleId" IS NULL;

UPDATE "Transmission"
SET "recipientId" = NULL
WHERE "recipientId" IS NOT NULL AND "circleId" IS NOT NULL;

ALTER TABLE "Transmission"
ADD CONSTRAINT "Transmission_exactly_one_target_check"
CHECK ((CASE WHEN "recipientId" IS NULL THEN 0 ELSE 1 END)
     + (CASE WHEN "circleId" IS NULL THEN 0 ELSE 1 END) = 1);

ALTER TABLE "Photo"
ADD CONSTRAINT "Photo_sizeBytes_check"
CHECK ("sizeBytes" IS NULL OR "sizeBytes" BETWEEN 1 AND 8388608);

ALTER TABLE "Report"
ADD CONSTRAINT "Report_exactly_one_target_check"
CHECK ((CASE WHEN "targetExplorerId" IS NULL THEN 0 ELSE 1 END)
     + (CASE WHEN "spotId" IS NULL THEN 0 ELSE 1 END)
     + (CASE WHEN "transmissionId" IS NULL THEN 0 ELSE 1 END) = 1);

ALTER TABLE "Block"
ADD CONSTRAINT "Block_no_self_check"
CHECK ("blockerId" <> "blockedId");

-- CreateIndex
CREATE INDEX "JourneyLike_authorId_createdAt_idx" ON "JourneyLike"("authorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyLike_journeyId_explorerId_key" ON "JourneyLike"("journeyId", "explorerId");

-- CreateIndex
CREATE INDEX "InviteUse_explorerId_idx" ON "InviteUse"("explorerId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteUse_inviteId_explorerId_key" ON "InviteUse"("inviteId", "explorerId");

INSERT INTO "InviteUse" ("id", "inviteId", "explorerId", "usedAt")
SELECT
    'legacy_' || md5("id" || ':' || "usedById"),
    "id",
    "usedById",
    COALESCE("usedAt", CURRENT_TIMESTAMP)
FROM "InviteCode"
WHERE "usedById" IS NOT NULL
ON CONFLICT ("inviteId", "explorerId") DO NOTHING;

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthToken_explorerId_type_idx" ON "AuthToken"("explorerId", "type");

-- CreateIndex
CREATE INDEX "AuthToken_expiresAt_idx" ON "AuthToken"("expiresAt");

-- CreateIndex
CREATE INDEX "TrustEvent_explorerId_createdAt_idx" ON "TrustEvent"("explorerId", "createdAt");

-- CreateIndex
CREATE INDEX "TrustEvent_type_referenceId_idx" ON "TrustEvent"("type", "referenceId");

-- CreateIndex
CREATE INDEX "TierEvent_explorerId_createdAt_idx" ON "TierEvent"("explorerId", "createdAt");

-- CreateIndex
CREATE INDEX "Reaction_explorerId_idx" ON "Reaction"("explorerId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_spotId_explorerId_key" ON "Reaction"("spotId", "explorerId");

-- CreateIndex
CREATE INDEX "SpotVerification_spotId_decision_idx" ON "SpotVerification"("spotId", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "SpotVerification_spotId_explorerId_key" ON "SpotVerification"("spotId", "explorerId");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- CreateIndex
CREATE INDEX "Block_blockedId_idx" ON "Block"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "Block"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "ModerationAction_moderatorId_createdAt_idx" ON "ModerationAction"("moderatorId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationAction_targetExplorerId_idx" ON "ModerationAction"("targetExplorerId");

-- CreateIndex
CREATE UNIQUE INDEX "Photo_objectKey_key" ON "Photo"("objectKey");

-- CreateIndex
CREATE UNIQUE INDEX "Signal_dedupeKey_key" ON "Signal"("dedupeKey");

CREATE INDEX "Explorer_purgeAt_idx" ON "Explorer"("purgeAt");

CREATE INDEX "Journey_routeExpiresAt_idx" ON "Journey"("routeExpiresAt");

-- AddForeignKey
ALTER TABLE "Explorer" ADD CONSTRAINT "Explorer_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "Explorer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spot" ADD CONSTRAINT "Spot_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyLike" ADD CONSTRAINT "JourneyLike_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyLike" ADD CONSTRAINT "JourneyLike_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyLike" ADD CONSTRAINT "JourneyLike_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Circle" ADD CONSTRAINT "Circle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Explorer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transmission" ADD CONSTRAINT "Transmission_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transmission" ADD CONSTRAINT "Transmission_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transmission" ADD CONSTRAINT "Transmission_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteUse" ADD CONSTRAINT "InviteUse_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "InviteCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteUse" ADD CONSTRAINT "InviteUse_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustEvent" ADD CONSTRAINT "TrustEvent_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierEvent" ADD CONSTRAINT "TierEvent_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpotVerification" ADD CONSTRAINT "SpotVerification_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpotVerification" ADD CONSTRAINT "SpotVerification_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetExplorerId_fkey" FOREIGN KEY ("targetExplorerId") REFERENCES "Explorer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_transmissionId_fkey" FOREIGN KEY ("transmissionId") REFERENCES "Transmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_targetExplorerId_fkey" FOREIGN KEY ("targetExplorerId") REFERENCES "Explorer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
