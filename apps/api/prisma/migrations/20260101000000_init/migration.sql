-- CreateEnum
CREATE TYPE "Archetype" AS ENUM ('WANDERER', 'URBEXER', 'NOMAD', 'HUNTER', 'PILGRIM');

-- CreateEnum
CREATE TYPE "Rank" AS ENUM ('NEWCOMER', 'EXPLORER', 'TRUSTED', 'INSIDER', 'LEGEND');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('FREE', 'PRO', 'EXPEDITION');

-- CreateEnum
CREATE TYPE "SpotCategory" AS ENUM ('ABANDONED', 'CAFE', 'BEACH', 'ROUTE', 'UNDERGROUND', 'VIEWPOINT', 'CAMP');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('PUBLIC', 'TRUSTED', 'CIRCLE_ONLY', 'SECRET_DROP');

-- CreateEnum
CREATE TYPE "CircleRole" AS ENUM ('MEMBER', 'GUIDE', 'FOUNDER');

-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('NEARBY_EXPLORER', 'SPOT_UNLOCKED', 'CIRCLE_INVITE', 'SECRET_DROP', 'JOURNEY_LIKE', 'TRANSMISSION');

-- CreateTable
CREATE TABLE "Explorer" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "handle" VARCHAR(24) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "displayName" VARCHAR(60),
    "archetype" "Archetype" NOT NULL DEFAULT 'WANDERER',
    "bio" VARCHAR(500),
    "obsessions" TEXT[],
    "pushToken" TEXT,
    "trustScore" INTEGER NOT NULL DEFAULT 0,
    "rank" "Rank" NOT NULL DEFAULT 'NEWCOMER',
    "invitedById" TEXT,
    "homeBaseEnc" TEXT,
    "locationConsent" BOOLEAN NOT NULL DEFAULT false,
    "presenceConsent" BOOLEAN NOT NULL DEFAULT false,
    "tier" "Tier" NOT NULL DEFAULT 'FREE',
    "tierExpiresAt" TIMESTAMP(3),
    "consentTerms" TIMESTAMP(3) NOT NULL,
    "consentPrivacy" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Explorer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spot" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "story" VARCHAR(2000),
    "category" "SpotCategory" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "h3Index" TEXT NOT NULL,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'PUBLIC',
    "circleId" TEXT,
    "dropExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Spot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Journey" (
    "id" TEXT NOT NULL,
    "explorerId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "mood" VARCHAR(60),
    "soundtrack" VARCHAR(500),
    "routeGeoJson" JSONB,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Journey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Circle" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "slug" VARCHAR(40) NOT NULL,
    "description" VARCHAR(300),
    "isInviteOnly" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Circle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CircleMember" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "explorerId" TEXT NOT NULL,
    "role" "CircleRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "spotId" TEXT,
    "uploaderId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpotSave" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "explorerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpotSave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transmission" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "circleId" TEXT,
    "body" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Transmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "explorerId" TEXT NOT NULL,
    "type" "SignalType" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "explorerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "usedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "explorerId" TEXT,
    "spotId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Explorer_email_key" ON "Explorer"("email");
CREATE UNIQUE INDEX "Explorer_handle_key" ON "Explorer"("handle");
CREATE INDEX "Explorer_handle_idx" ON "Explorer"("handle");
CREATE INDEX "Explorer_deletedAt_idx" ON "Explorer"("deletedAt");
CREATE INDEX "Spot_h3Index_idx" ON "Spot"("h3Index");
CREATE INDEX "Spot_accessLevel_idx" ON "Spot"("accessLevel");
CREATE INDEX "Spot_ownerId_idx" ON "Spot"("ownerId");
CREATE INDEX "Journey_explorerId_idx" ON "Journey"("explorerId");
CREATE UNIQUE INDEX "Circle_slug_key" ON "Circle"("slug");
CREATE UNIQUE INDEX "CircleMember_circleId_explorerId_key" ON "CircleMember"("circleId", "explorerId");
CREATE UNIQUE INDEX "SpotSave_spotId_explorerId_key" ON "SpotSave"("spotId", "explorerId");
CREATE INDEX "Transmission_recipientId_idx" ON "Transmission"("recipientId");
CREATE INDEX "Transmission_circleId_idx" ON "Transmission"("circleId");
CREATE INDEX "Signal_explorerId_idx" ON "Signal"("explorerId");
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_explorerId_idx" ON "RefreshToken"("explorerId");
CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");
CREATE INDEX "AuditLog_explorerId_idx" ON "AuditLog"("explorerId");
CREATE INDEX "AuditLog_spotId_idx" ON "AuditLog"("spotId");

-- AddForeignKey
ALTER TABLE "Spot" ADD CONSTRAINT "Spot_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Journey" ADD CONSTRAINT "Journey_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleMember" ADD CONSTRAINT "CircleMember_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleMember" ADD CONSTRAINT "CircleMember_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "Explorer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpotSave" ADD CONSTRAINT "SpotSave_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpotSave" ADD CONSTRAINT "SpotSave_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transmission" ADD CONSTRAINT "Transmission_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Explorer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
