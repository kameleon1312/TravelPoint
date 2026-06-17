-- Sprint 3: scale, monetization and WORLD foundations

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE "BillingProvider" AS ENUM ('STRIPE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('INCOMPLETE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');
CREATE TYPE "ForumCategory" AS ENUM ('FIELD_NOTES', 'GEAR', 'SAFETY', 'REQUESTS', 'STORIES');
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

ALTER TABLE "Explorer"
  ADD COLUMN "stripeCustomerId" TEXT;

CREATE UNIQUE INDEX "Explorer_stripeCustomerId_key" ON "Explorer"("stripeCustomerId");

ALTER TABLE "Spot"
  ADD COLUMN "location" geography(Point, 4326);

UPDATE "Spot"
SET "location" = ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography
WHERE "location" IS NULL;

CREATE INDEX "Spot_location_idx" ON "Spot" USING GIST ("location");

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "explorerId" TEXT NOT NULL,
  "provider" "BillingProvider" NOT NULL DEFAULT 'STRIPE',
  "providerCustomerId" TEXT NOT NULL,
  "providerSubscriptionId" TEXT,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
  "tier" "Tier" NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Subscription_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");
CREATE INDEX "Subscription_explorerId_idx" ON "Subscription"("explorerId");
CREATE INDEX "Subscription_providerCustomerId_idx" ON "Subscription"("providerCustomerId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

CREATE TABLE "ForumPost" (
  "id" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "slug" VARCHAR(140) NOT NULL,
  "body" VARCHAR(5000) NOT NULL,
  "category" "ForumCategory" NOT NULL,
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "lockedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ForumPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ForumPost_slug_key" ON "ForumPost"("slug");
CREATE INDEX "ForumPost_category_createdAt_idx" ON "ForumPost"("category", "createdAt");
CREATE INDEX "ForumPost_authorId_idx" ON "ForumPost"("authorId");

CREATE TABLE "ForumReply" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" VARCHAR(3000) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ForumReply_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ForumReply_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ForumReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ForumReply_postId_createdAt_idx" ON "ForumReply"("postId", "createdAt");
CREATE INDEX "ForumReply_authorId_idx" ON "ForumReply"("authorId");

CREATE TABLE "JournalPost" (
  "id" TEXT NOT NULL,
  "slug" VARCHAR(140) NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "excerpt" VARCHAR(400) NOT NULL,
  "bodyMdx" TEXT NOT NULL,
  "coverImage" TEXT,
  "authorName" VARCHAR(80) NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JournalPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JournalPost_slug_key" ON "JournalPost"("slug");
CREATE INDEX "JournalPost_status_publishedAt_idx" ON "JournalPost"("status", "publishedAt");

CREATE TABLE "AnalyticsEvent" (
  "id" TEXT NOT NULL,
  "explorerId" TEXT,
  "sessionId" VARCHAR(120),
  "name" VARCHAR(80) NOT NULL,
  "source" VARCHAR(40),
  "path" VARCHAR(500),
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AnalyticsEvent_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");
CREATE INDEX "AnalyticsEvent_explorerId_createdAt_idx" ON "AnalyticsEvent"("explorerId", "createdAt");

ALTER TABLE "Report"
  ADD COLUMN "forumPostId" TEXT,
  ADD COLUMN "forumReplyId" TEXT;

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_forumPostId_fkey" FOREIGN KEY ("forumPostId") REFERENCES "ForumPost"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Report_forumReplyId_fkey" FOREIGN KEY ("forumReplyId") REFERENCES "ForumReply"("id") ON DELETE SET NULL ON UPDATE CASCADE;
