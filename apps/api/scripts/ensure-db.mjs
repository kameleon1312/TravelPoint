/**
 * ensure-db.mjs — idempotent pre-migration guard for Render / Railway / any cold-start.
 *
 * Handles four states before handing off to `prisma migrate deploy`:
 *
 *   A. _prisma_migrations missing — create it (prevents P3005)
 *   B. Failed / in-progress rows (finished_at IS NULL) — delete them (prevents P3009)
 *   C. Table exists but empty + app tables already present — baseline all migrations
 *      so `migrate deploy` skips them instead of trying to re-create existing tables
 *   D. Full schema repair — adds EVERY column, table, enum, index, FK and constraint
 *      that migrations would have created. Runs idempotently on EVERY deploy so that
 *      Scenario C (baseline without SQL) never leaves the DB in an inconsistent state.
 */
import pg from 'pg';
import { readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env['DATABASE_URL'], max: 1 });
const client = await pool.connect();

async function tableExists(name) {
  const r = await client.query(
    `SELECT EXISTS(
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS e`,
    [name],
  );
  return r.rows[0].e === true;
}

async function getMigrationNames() {
  const dir = resolve(ROOT, 'prisma', 'migrations');
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory() && /^\d{14}_/.test(e.name))
    .map(e => e.name)
    .sort();
}

// Runs a SQL statement, logs a warning on error but never throws.
async function run(sql, label) {
  try {
    await client.query(sql);
  } catch (err) {
    console.warn(`[ensure-db] WARN ${label}: ${err.message.split('\n')[0]}`);
  }
}

// Adds a FK constraint idempotently (silently ignores duplicate_object).
async function addFk(label, alterSql) {
  await run(
    `DO $body$ BEGIN ${alterSql} EXCEPTION WHEN duplicate_object THEN null; END $body$`,
    `FK ${label}`,
  );
}

try {
  // ── A. Ensure _prisma_migrations table exists ────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      id                   VARCHAR(36)  PRIMARY KEY,
      checksum             VARCHAR(64)  NOT NULL,
      finished_at          TIMESTAMPTZ,
      migration_name       VARCHAR(255) NOT NULL,
      logs                 TEXT,
      rolled_back_at       TIMESTAMPTZ,
      started_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
      applied_steps_count  INTEGER      NOT NULL DEFAULT 0
    )
  `);

  // ── B. Remove failed/in-progress rows (finished_at IS NULL, not rolled back) ─
  const { rowCount: failed } = await client.query(`
    DELETE FROM "_prisma_migrations"
    WHERE finished_at IS NULL AND rolled_back_at IS NULL
  `);
  if (failed > 0) {
    console.log(`[ensure-db] Removed ${failed} failed migration row(s) — clearing P3009`);
  }

  // ── C. Baseline if app tables exist but migration history is empty ────────────
  const appExists = await tableExists('Explorer');
  const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM "_prisma_migrations"`);
  const appliedCount = rows[0].n;

  if (appExists && appliedCount === 0) {
    console.log('[ensure-db] App tables exist but no migration history — baselining all migrations');
    const names = await getMigrationNames();
    for (const name of names) {
      await client.query(
        `INSERT INTO "_prisma_migrations"
           (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
         VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
        [crypto.randomUUID(), '0'.repeat(64), name],
      );
      console.log(`[ensure-db]   baselined: ${name}`);
    }
  }

  // ── D. Full schema repair ────────────────────────────────────────────────────
  // Runs idempotently on EVERY deploy. Scenario C baselines migrations without
  // executing their SQL — this section physically applies every schema change.
  console.log('[ensure-db] Running schema repair (Section D)...');

  // D.1 — Extensions
  await run(`CREATE EXTENSION IF NOT EXISTS postgis`, 'postgis');

  // D.2 — Missing enum types (all post-_init enums, idempotent via DO/EXCEPTION)
  const enumDefs = [
    ['InvitePurpose',        `'ACCOUNT', 'CIRCLE'`],
    ['AccountRole',          `'USER', 'MODERATOR', 'ADMIN'`],
    ['AuthTokenType',        `'EMAIL_VERIFICATION', 'PASSWORD_RESET'`],
    ['TrustEventType',       `'SPOT_CREATED', 'PHOTO_ADDED', 'SPOT_VERIFIED', 'REACTION_RECEIVED', 'INVITE_JOINED', 'JOURNEY_PUBLISHED', 'WEEK_ACTIVE', 'MODERATION_PENALTY'`],
    ['ReactionType',         `'LIKE', 'INSIGHTFUL', 'HIDDEN_GEM'`],
    ['VerificationDecision', `'CONFIRMED', 'REJECTED'`],
    ['ReportReason',         `'SAFETY', 'HARASSMENT', 'SPAM', 'ILLEGAL_CONTENT', 'PRIVACY', 'OTHER'`],
    ['ReportStatus',         `'OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED'`],
    ['ModerationActionType', `'SUSPEND', 'UNSUSPEND', 'DELETE_CONTENT', 'WARN', 'RESOLVE_REPORT'`],
    ['BillingProvider',      `'STRIPE'`],
    ['SubscriptionStatus',   `'INCOMPLETE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID'`],
    ['ForumCategory',        `'FIELD_NOTES', 'GEAR', 'SAFETY', 'REQUESTS', 'STORIES'`],
    ['ContentStatus',        `'DRAFT', 'PUBLISHED', 'ARCHIVED'`],
  ];
  for (const [name, vals] of enumDefs) {
    await run(
      `DO $$ BEGIN CREATE TYPE "${name}" AS ENUM (${vals}); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `enum ${name}`,
    );
  }

  // D.3 — New SignalType values (PostgreSQL 17: ADD VALUE IF NOT EXISTS is safe outside txn)
  for (const val of ['FORUM_REPLY', 'NEARBY_SPOT', 'SPOT_COMMENT', 'RANK_UP']) {
    await run(`ALTER TYPE "SignalType" ADD VALUE IF NOT EXISTS '${val}'`, `SignalType.${val}`);
  }

  // D.4 — Missing columns on Explorer (auth-critical columns first)
  await run(`ALTER TABLE "Explorer" ADD COLUMN IF NOT EXISTS "supabaseId" TEXT`, 'Explorer.supabaseId');
  await run(`ALTER TABLE "Explorer" ALTER COLUMN "passwordHash" DROP NOT NULL`, 'Explorer.passwordHash nullable');
  await run(`ALTER TABLE "Explorer" ADD COLUMN IF NOT EXISTS "role" "AccountRole" NOT NULL DEFAULT 'USER'`, 'Explorer.role');
  await run(`ALTER TABLE "Explorer" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3)`, 'Explorer.suspendedAt');
  await run(`ALTER TABLE "Explorer" ADD COLUMN IF NOT EXISTS "suspensionReason" VARCHAR(500)`, 'Explorer.suspensionReason');
  await run(`ALTER TABLE "Explorer" ADD COLUMN IF NOT EXISTS "purgeAt" TIMESTAMP(3)`, 'Explorer.purgeAt');
  await run(`ALTER TABLE "Explorer" ADD COLUMN IF NOT EXISTS "territories" TEXT[] NOT NULL DEFAULT '{}'`, 'Explorer.territories');
  await run(`ALTER TABLE "Explorer" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT`, 'Explorer.stripeCustomerId');
  await run(`ALTER TABLE "Explorer" ADD COLUMN IF NOT EXISTS "avatarUrl" VARCHAR(500)`, 'Explorer.avatarUrl');

  // D.5 — Missing columns on other existing tables
  await run(`ALTER TABLE "Circle" ADD COLUMN IF NOT EXISTS "createdById" TEXT`, 'Circle.createdById');
  await run(`ALTER TABLE "Journey" ADD COLUMN IF NOT EXISTS "retainRoute" BOOLEAN NOT NULL DEFAULT false`, 'Journey.retainRoute');
  await run(`ALTER TABLE "Journey" ADD COLUMN IF NOT EXISTS "routeExpiresAt" TIMESTAMP(3)`, 'Journey.routeExpiresAt');
  await run(`ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "mimeType" VARCHAR(100)`, 'Photo.mimeType');
  await run(`ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "objectKey" TEXT`, 'Photo.objectKey');
  await run(`ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "sizeBytes" INTEGER`, 'Photo.sizeBytes');
  await run(`ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "thumbnailKey" TEXT`, 'Photo.thumbnailKey');
  await run(`ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT`, 'Photo.thumbnailUrl');
  await run(`ALTER TABLE "Signal" ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT`, 'Signal.dedupeKey');
  await run(`ALTER TABLE "InviteCode" ADD COLUMN IF NOT EXISTS "purpose" "InvitePurpose" NOT NULL DEFAULT 'ACCOUNT'`, 'InviteCode.purpose');
  await run(`ALTER TABLE "InviteCode" ADD COLUMN IF NOT EXISTS "circleId" TEXT`, 'InviteCode.circleId');
  await run(`ALTER TABLE "InviteCode" ADD COLUMN IF NOT EXISTS "maxUses" INTEGER NOT NULL DEFAULT 1`, 'InviteCode.maxUses');
  await run(`ALTER TABLE "InviteCode" ADD COLUMN IF NOT EXISTS "useCount" INTEGER NOT NULL DEFAULT 0`, 'InviteCode.useCount');
  await run(`ALTER TABLE "Spot" ADD COLUMN IF NOT EXISTS "location" geography(Point, 4326)`, 'Spot.location');
  await run(
    `UPDATE "Spot" SET "location" = ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography WHERE "location" IS NULL`,
    'Spot.location backfill',
  );
  // Report columns added in sprint3 (table itself is sprint2)
  await run(`ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "forumPostId" TEXT`, 'Report.forumPostId');
  await run(`ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "forumReplyId" TEXT`, 'Report.forumReplyId');

  // D.6 — New tables from sprint2 (CREATE TABLE IF NOT EXISTS = safe to re-run)
  await run(`
    CREATE TABLE IF NOT EXISTS "JourneyLike" (
      "id"         TEXT         NOT NULL,
      "journeyId"  TEXT         NOT NULL,
      "explorerId" TEXT         NOT NULL,
      "authorId"   TEXT         NOT NULL,
      "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "JourneyLike_pkey" PRIMARY KEY ("id")
    )`, 'table JourneyLike');

  await run(`
    CREATE TABLE IF NOT EXISTS "InviteUse" (
      "id"         TEXT         NOT NULL,
      "inviteId"   TEXT         NOT NULL,
      "explorerId" TEXT         NOT NULL,
      "usedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "InviteUse_pkey" PRIMARY KEY ("id")
    )`, 'table InviteUse');

  await run(`
    CREATE TABLE IF NOT EXISTS "AuthToken" (
      "id"         TEXT             NOT NULL,
      "explorerId" TEXT             NOT NULL,
      "type"       "AuthTokenType"  NOT NULL,
      "tokenHash"  TEXT             NOT NULL,
      "expiresAt"  TIMESTAMP(3)     NOT NULL,
      "usedAt"     TIMESTAMP(3),
      "createdAt"  TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
    )`, 'table AuthToken');

  await run(`
    CREATE TABLE IF NOT EXISTS "TrustEvent" (
      "id"          TEXT             NOT NULL,
      "explorerId"  TEXT             NOT NULL,
      "type"        "TrustEventType" NOT NULL,
      "delta"       INTEGER          NOT NULL,
      "scoreAfter"  INTEGER          NOT NULL,
      "rankAfter"   "Rank"           NOT NULL,
      "referenceId" TEXT,
      "metadata"    JSONB,
      "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TrustEvent_pkey" PRIMARY KEY ("id")
    )`, 'table TrustEvent');

  await run(`
    CREATE TABLE IF NOT EXISTS "TierEvent" (
      "id"         TEXT         NOT NULL,
      "explorerId" TEXT         NOT NULL,
      "fromTier"   "Tier",
      "toTier"     "Tier"       NOT NULL,
      "reason"     VARCHAR(120) NOT NULL,
      "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TierEvent_pkey" PRIMARY KEY ("id")
    )`, 'table TierEvent');

  await run(`
    CREATE TABLE IF NOT EXISTS "Reaction" (
      "id"         TEXT           NOT NULL,
      "spotId"     TEXT           NOT NULL,
      "explorerId" TEXT           NOT NULL,
      "type"       "ReactionType" NOT NULL,
      "createdAt"  TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
    )`, 'table Reaction');

  await run(`
    CREATE TABLE IF NOT EXISTS "SpotVerification" (
      "id"         TEXT                   NOT NULL,
      "spotId"     TEXT                   NOT NULL,
      "explorerId" TEXT                   NOT NULL,
      "decision"   "VerificationDecision" NOT NULL,
      "note"       VARCHAR(500),
      "createdAt"  TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"  TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SpotVerification_pkey" PRIMARY KEY ("id")
    )`, 'table SpotVerification');

  // Report created with all columns (sprint2 base + sprint3 forumPost/Reply columns)
  await run(`
    CREATE TABLE IF NOT EXISTS "Report" (
      "id"               TEXT           NOT NULL,
      "reporterId"       TEXT           NOT NULL,
      "targetExplorerId" TEXT,
      "spotId"           TEXT,
      "transmissionId"   TEXT,
      "forumPostId"      TEXT,
      "forumReplyId"     TEXT,
      "reason"           "ReportReason" NOT NULL,
      "details"          VARCHAR(1000),
      "status"           "ReportStatus" NOT NULL DEFAULT 'OPEN',
      "resolution"       VARCHAR(1000),
      "resolvedAt"       TIMESTAMP(3),
      "createdAt"        TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
    )`, 'table Report');

  await run(`
    CREATE TABLE IF NOT EXISTS "Block" (
      "id"        TEXT         NOT NULL,
      "blockerId" TEXT         NOT NULL,
      "blockedId" TEXT         NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
    )`, 'table Block');

  await run(`
    CREATE TABLE IF NOT EXISTS "ModerationAction" (
      "id"               TEXT                   NOT NULL,
      "moderatorId"      TEXT                   NOT NULL,
      "targetExplorerId" TEXT,
      "reportId"         TEXT,
      "type"             "ModerationActionType" NOT NULL,
      "reason"           VARCHAR(1000)          NOT NULL,
      "createdAt"        TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
    )`, 'table ModerationAction');

  // D.7 — New tables from sprint3
  await run(`
    CREATE TABLE IF NOT EXISTS "Subscription" (
      "id"                     TEXT                 NOT NULL,
      "explorerId"             TEXT                 NOT NULL,
      "provider"               "BillingProvider"    NOT NULL DEFAULT 'STRIPE',
      "providerCustomerId"     TEXT                 NOT NULL,
      "providerSubscriptionId" TEXT,
      "status"                 "SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
      "tier"                   "Tier"               NOT NULL,
      "currentPeriodEnd"       TIMESTAMP(3),
      "cancelAtPeriodEnd"      BOOLEAN              NOT NULL DEFAULT false,
      "createdAt"              TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"              TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
    )`, 'table Subscription');

  await run(`
    CREATE TABLE IF NOT EXISTS "ForumPost" (
      "id"        TEXT             NOT NULL,
      "authorId"  TEXT             NOT NULL,
      "title"     VARCHAR(120)     NOT NULL,
      "slug"      VARCHAR(140)     NOT NULL,
      "body"      VARCHAR(5000)    NOT NULL,
      "category"  "ForumCategory"  NOT NULL,
      "isPinned"  BOOLEAN          NOT NULL DEFAULT false,
      "lockedAt"  TIMESTAMP(3),
      "createdAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
    )`, 'table ForumPost');

  await run(`
    CREATE TABLE IF NOT EXISTS "ForumReply" (
      "id"        TEXT         NOT NULL,
      "postId"    TEXT         NOT NULL,
      "authorId"  TEXT         NOT NULL,
      "body"      VARCHAR(3000) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ForumReply_pkey" PRIMARY KEY ("id")
    )`, 'table ForumReply');

  await run(`
    CREATE TABLE IF NOT EXISTS "JournalPost" (
      "id"          TEXT            NOT NULL,
      "slug"        VARCHAR(140)    NOT NULL,
      "title"       VARCHAR(160)    NOT NULL,
      "excerpt"     VARCHAR(400)    NOT NULL,
      "bodyMdx"     TEXT            NOT NULL,
      "coverImage"  TEXT,
      "authorName"  VARCHAR(80)     NOT NULL,
      "publishedAt" TIMESTAMP(3),
      "status"      "ContentStatus" NOT NULL DEFAULT 'DRAFT',
      "createdAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "JournalPost_pkey" PRIMARY KEY ("id")
    )`, 'table JournalPost');

  await run(`
    CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
      "id"         TEXT         NOT NULL,
      "explorerId" TEXT,
      "sessionId"  VARCHAR(120),
      "name"       VARCHAR(80)  NOT NULL,
      "source"     VARCHAR(40),
      "path"       VARCHAR(500),
      "payload"    JSONB,
      "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
    )`, 'table AnalyticsEvent');

  // D.8 — New table from sprint6
  await run(`
    CREATE TABLE IF NOT EXISTS "SpotComment" (
      "id"         TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
      "spotId"     TEXT         NOT NULL,
      "explorerId" TEXT         NOT NULL,
      "body"       VARCHAR(500) NOT NULL,
      "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      CONSTRAINT "SpotComment_pkey" PRIMARY KEY ("id")
    )`, 'table SpotComment');

  // D.9 — Indexes (all IF NOT EXISTS)
  // Explorer
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "Explorer_supabaseId_key"      ON "Explorer"("supabaseId")`, 'idx Explorer_supabaseId_key');
  await run(`CREATE INDEX        IF NOT EXISTS "Explorer_supabaseId_idx"      ON "Explorer"("supabaseId")`, 'idx Explorer_supabaseId_idx');
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "Explorer_stripeCustomerId_key" ON "Explorer"("stripeCustomerId")`, 'idx Explorer_stripeCustomerId_key');
  await run(`CREATE INDEX        IF NOT EXISTS "Explorer_purgeAt_idx"          ON "Explorer"("purgeAt")`, 'idx Explorer_purgeAt_idx');
  // Spot
  await run(`CREATE INDEX IF NOT EXISTS "Spot_lat_lng_idx"      ON "Spot"("lat", "lng")`, 'idx Spot_lat_lng_idx');
  await run(`CREATE INDEX IF NOT EXISTS "Spot_location_idx"     ON "Spot" USING GIST ("location")`, 'idx Spot_location_idx');
  // Journey
  await run(`CREATE INDEX IF NOT EXISTS "Journey_routeExpiresAt_idx" ON "Journey"("routeExpiresAt")`, 'idx Journey_routeExpiresAt_idx');
  // Transmission
  await run(`CREATE INDEX IF NOT EXISTS "Transmission_senderId_recipientId_idx" ON "Transmission"("senderId", "recipientId")`, 'idx Transmission_senderId_recipientId_idx');
  // Signal
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "Signal_dedupeKey_key" ON "Signal"("dedupeKey")`, 'idx Signal_dedupeKey_key');
  // Photo
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "Photo_objectKey_key" ON "Photo"("objectKey")`, 'idx Photo_objectKey_key');
  // InviteCode
  await run(`CREATE INDEX IF NOT EXISTS "InviteCode_createdById_idx"        ON "InviteCode"("createdById")`, 'idx InviteCode_createdById_idx');
  await run(`CREATE INDEX IF NOT EXISTS "InviteCode_circleId_idx"            ON "InviteCode"("circleId")`, 'idx InviteCode_circleId_idx');
  await run(`CREATE INDEX IF NOT EXISTS "InviteCode_purpose_expiresAt_idx"   ON "InviteCode"("purpose", "expiresAt")`, 'idx InviteCode_purpose_expiresAt_idx');
  // JourneyLike
  await run(`CREATE INDEX        IF NOT EXISTS "JourneyLike_authorId_createdAt_idx"  ON "JourneyLike"("authorId", "createdAt")`, 'idx JourneyLike_authorId_createdAt_idx');
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "JourneyLike_journeyId_explorerId_key" ON "JourneyLike"("journeyId", "explorerId")`, 'idx JourneyLike_unique');
  // InviteUse
  await run(`CREATE INDEX        IF NOT EXISTS "InviteUse_explorerId_idx"            ON "InviteUse"("explorerId")`, 'idx InviteUse_explorerId_idx');
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "InviteUse_inviteId_explorerId_key"   ON "InviteUse"("inviteId", "explorerId")`, 'idx InviteUse_unique');
  // AuthToken
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "AuthToken_tokenHash_key"      ON "AuthToken"("tokenHash")`, 'idx AuthToken_tokenHash_key');
  await run(`CREATE INDEX        IF NOT EXISTS "AuthToken_explorerId_type_idx" ON "AuthToken"("explorerId", "type")`, 'idx AuthToken_explorerId_type_idx');
  await run(`CREATE INDEX        IF NOT EXISTS "AuthToken_expiresAt_idx"       ON "AuthToken"("expiresAt")`, 'idx AuthToken_expiresAt_idx');
  // TrustEvent
  await run(`CREATE INDEX IF NOT EXISTS "TrustEvent_explorerId_createdAt_idx" ON "TrustEvent"("explorerId", "createdAt")`, 'idx TrustEvent_explorerId_createdAt_idx');
  await run(`CREATE INDEX IF NOT EXISTS "TrustEvent_type_referenceId_idx"     ON "TrustEvent"("type", "referenceId")`, 'idx TrustEvent_type_referenceId_idx');
  // TierEvent
  await run(`CREATE INDEX IF NOT EXISTS "TierEvent_explorerId_createdAt_idx" ON "TierEvent"("explorerId", "createdAt")`, 'idx TierEvent_explorerId_createdAt_idx');
  // Reaction
  await run(`CREATE INDEX        IF NOT EXISTS "Reaction_explorerId_idx"          ON "Reaction"("explorerId")`, 'idx Reaction_explorerId_idx');
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "Reaction_spotId_explorerId_key"   ON "Reaction"("spotId", "explorerId")`, 'idx Reaction_unique');
  // SpotVerification
  await run(`CREATE INDEX        IF NOT EXISTS "SpotVerification_spotId_decision_idx"    ON "SpotVerification"("spotId", "decision")`, 'idx SpotVerification_spotId_decision_idx');
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "SpotVerification_spotId_explorerId_key"  ON "SpotVerification"("spotId", "explorerId")`, 'idx SpotVerification_unique');
  // Report
  await run(`CREATE INDEX IF NOT EXISTS "Report_status_createdAt_idx" ON "Report"("status", "createdAt")`, 'idx Report_status_createdAt_idx');
  await run(`CREATE INDEX IF NOT EXISTS "Report_reporterId_idx"        ON "Report"("reporterId")`, 'idx Report_reporterId_idx');
  // Block
  await run(`CREATE INDEX        IF NOT EXISTS "Block_blockedId_idx"            ON "Block"("blockedId")`, 'idx Block_blockedId_idx');
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "Block_blockerId_blockedId_key"  ON "Block"("blockerId", "blockedId")`, 'idx Block_unique');
  // ModerationAction
  await run(`CREATE INDEX IF NOT EXISTS "ModerationAction_moderatorId_createdAt_idx" ON "ModerationAction"("moderatorId", "createdAt")`, 'idx ModerationAction_moderatorId_idx');
  await run(`CREATE INDEX IF NOT EXISTS "ModerationAction_targetExplorerId_idx"      ON "ModerationAction"("targetExplorerId")`, 'idx ModerationAction_targetExplorerId_idx');
  // Subscription
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId")`, 'idx Subscription_providerSubscriptionId_key');
  await run(`CREATE INDEX        IF NOT EXISTS "Subscription_explorerId_idx"              ON "Subscription"("explorerId")`, 'idx Subscription_explorerId_idx');
  await run(`CREATE INDEX        IF NOT EXISTS "Subscription_providerCustomerId_idx"      ON "Subscription"("providerCustomerId")`, 'idx Subscription_providerCustomerId_idx');
  await run(`CREATE INDEX        IF NOT EXISTS "Subscription_status_idx"                  ON "Subscription"("status")`, 'idx Subscription_status_idx');
  // ForumPost
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "ForumPost_slug_key"               ON "ForumPost"("slug")`, 'idx ForumPost_slug_key');
  await run(`CREATE INDEX        IF NOT EXISTS "ForumPost_category_createdAt_idx" ON "ForumPost"("category", "createdAt")`, 'idx ForumPost_category_createdAt_idx');
  await run(`CREATE INDEX        IF NOT EXISTS "ForumPost_authorId_idx"           ON "ForumPost"("authorId")`, 'idx ForumPost_authorId_idx');
  // ForumReply
  await run(`CREATE INDEX IF NOT EXISTS "ForumReply_postId_createdAt_idx" ON "ForumReply"("postId", "createdAt")`, 'idx ForumReply_postId_createdAt_idx');
  await run(`CREATE INDEX IF NOT EXISTS "ForumReply_authorId_idx"         ON "ForumReply"("authorId")`, 'idx ForumReply_authorId_idx');
  // JournalPost
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "JournalPost_slug_key"              ON "JournalPost"("slug")`, 'idx JournalPost_slug_key');
  await run(`CREATE INDEX        IF NOT EXISTS "JournalPost_status_publishedAt_idx" ON "JournalPost"("status", "publishedAt")`, 'idx JournalPost_status_publishedAt_idx');
  // AnalyticsEvent
  await run(`CREATE INDEX IF NOT EXISTS "AnalyticsEvent_name_createdAt_idx"       ON "AnalyticsEvent"("name", "createdAt")`, 'idx AnalyticsEvent_name_createdAt_idx');
  await run(`CREATE INDEX IF NOT EXISTS "AnalyticsEvent_explorerId_createdAt_idx" ON "AnalyticsEvent"("explorerId", "createdAt")`, 'idx AnalyticsEvent_explorerId_createdAt_idx');
  // SpotComment
  await run(`CREATE INDEX IF NOT EXISTS "SpotComment_spotId_createdAt_idx" ON "SpotComment"("spotId", "createdAt")`, 'idx SpotComment_spotId_createdAt_idx');
  await run(`CREATE INDEX IF NOT EXISTS "SpotComment_explorerId_idx"       ON "SpotComment"("explorerId")`, 'idx SpotComment_explorerId_idx');

  // D.10 — Foreign keys
  // Fix _init FKs changed by sprint2 (RESTRICT → CASCADE): drop old, add new
  await run(`ALTER TABLE "Photo"        DROP CONSTRAINT IF EXISTS "Photo_uploaderId_fkey"`,        'drop Photo_uploaderId_fkey');
  await run(`ALTER TABLE "Transmission" DROP CONSTRAINT IF EXISTS "Transmission_senderId_fkey"`,   'drop Transmission_senderId_fkey');
  await addFk('Photo_uploaderId_fkey',        `ALTER TABLE "Photo" ADD CONSTRAINT "Photo_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('Transmission_senderId_fkey',   `ALTER TABLE "Transmission" ADD CONSTRAINT "Transmission_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);

  // New FKs on existing _init tables (added by sprint2 & sprint3)
  await addFk('Explorer_invitedById_fkey',    `ALTER TABLE "Explorer" ADD CONSTRAINT "Explorer_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "Explorer"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);
  await addFk('Spot_circleId_fkey',           `ALTER TABLE "Spot" ADD CONSTRAINT "Spot_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);
  await addFk('Circle_createdById_fkey',      `ALTER TABLE "Circle" ADD CONSTRAINT "Circle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Explorer"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);
  await addFk('Transmission_recipientId_fkey',`ALTER TABLE "Transmission" ADD CONSTRAINT "Transmission_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('Transmission_circleId_fkey',   `ALTER TABLE "Transmission" ADD CONSTRAINT "Transmission_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('InviteCode_createdById_fkey',  `ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('InviteCode_usedById_fkey',     `ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "Explorer"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);
  await addFk('InviteCode_circleId_fkey',     `ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);

  // FKs for sprint2 new tables
  await addFk('JourneyLike_journeyId_fkey',   `ALTER TABLE "JourneyLike" ADD CONSTRAINT "JourneyLike_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('JourneyLike_explorerId_fkey',  `ALTER TABLE "JourneyLike" ADD CONSTRAINT "JourneyLike_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('JourneyLike_authorId_fkey',    `ALTER TABLE "JourneyLike" ADD CONSTRAINT "JourneyLike_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('InviteUse_inviteId_fkey',      `ALTER TABLE "InviteUse" ADD CONSTRAINT "InviteUse_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "InviteCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('InviteUse_explorerId_fkey',    `ALTER TABLE "InviteUse" ADD CONSTRAINT "InviteUse_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('AuthToken_explorerId_fkey',    `ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('TrustEvent_explorerId_fkey',   `ALTER TABLE "TrustEvent" ADD CONSTRAINT "TrustEvent_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('TierEvent_explorerId_fkey',    `ALTER TABLE "TierEvent" ADD CONSTRAINT "TierEvent_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('Reaction_spotId_fkey',         `ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('Reaction_explorerId_fkey',     `ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('SpotVerification_spotId_fkey', `ALTER TABLE "SpotVerification" ADD CONSTRAINT "SpotVerification_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('SpotVerification_explorerId_fkey', `ALTER TABLE "SpotVerification" ADD CONSTRAINT "SpotVerification_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('Report_reporterId_fkey',           `ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('Report_targetExplorerId_fkey',     `ALTER TABLE "Report" ADD CONSTRAINT "Report_targetExplorerId_fkey" FOREIGN KEY ("targetExplorerId") REFERENCES "Explorer"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);
  await addFk('Report_spotId_fkey',               `ALTER TABLE "Report" ADD CONSTRAINT "Report_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);
  await addFk('Report_transmissionId_fkey',       `ALTER TABLE "Report" ADD CONSTRAINT "Report_transmissionId_fkey" FOREIGN KEY ("transmissionId") REFERENCES "Transmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);
  await addFk('Block_blockerId_fkey',             `ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('Block_blockedId_fkey',             `ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('ModerationAction_moderatorId_fkey',     `ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('ModerationAction_targetExplorerId_fkey',`ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_targetExplorerId_fkey" FOREIGN KEY ("targetExplorerId") REFERENCES "Explorer"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);
  await addFk('ModerationAction_reportId_fkey',        `ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);

  // FKs for sprint3 new tables (ForumPost/Reply must exist before Report FKs referencing them)
  await addFk('Subscription_explorerId_fkey',  `ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('ForumPost_authorId_fkey',        `ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('ForumReply_postId_fkey',         `ALTER TABLE "ForumReply" ADD CONSTRAINT "ForumReply_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('ForumReply_authorId_fkey',       `ALTER TABLE "ForumReply" ADD CONSTRAINT "ForumReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Explorer"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  await addFk('AnalyticsEvent_explorerId_fkey', `ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);
  await addFk('Report_forumPostId_fkey',        `ALTER TABLE "Report" ADD CONSTRAINT "Report_forumPostId_fkey" FOREIGN KEY ("forumPostId") REFERENCES "ForumPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);
  await addFk('Report_forumReplyId_fkey',       `ALTER TABLE "Report" ADD CONSTRAINT "Report_forumReplyId_fkey" FOREIGN KEY ("forumReplyId") REFERENCES "ForumReply"("id") ON DELETE SET NULL ON UPDATE CASCADE;`);

  // FKs for sprint6 new table
  await addFk('SpotComment_spotId_fkey',     `ALTER TABLE "SpotComment" ADD CONSTRAINT "SpotComment_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE CASCADE;`);
  await addFk('SpotComment_explorerId_fkey', `ALTER TABLE "SpotComment" ADD CONSTRAINT "SpotComment_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "Explorer"("id") ON DELETE CASCADE;`);

  // D.11 — CHECK constraints (idempotent via DO/EXCEPTION)
  await run(`DO $$ BEGIN ALTER TABLE "Transmission" ADD CONSTRAINT "Transmission_exactly_one_target_check" CHECK ((CASE WHEN "recipientId" IS NULL THEN 0 ELSE 1 END) + (CASE WHEN "circleId" IS NULL THEN 0 ELSE 1 END) = 1); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'constraint Transmission_exactly_one_target_check');
  await run(`DO $$ BEGIN ALTER TABLE "Photo" ADD CONSTRAINT "Photo_sizeBytes_check" CHECK ("sizeBytes" IS NULL OR "sizeBytes" BETWEEN 1 AND 8388608); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'constraint Photo_sizeBytes_check');
  await run(`DO $$ BEGIN ALTER TABLE "Block" ADD CONSTRAINT "Block_no_self_check" CHECK ("blockerId" <> "blockedId"); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'constraint Block_no_self_check');
  await run(`DO $$ BEGIN ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_positive_max_uses" CHECK ("maxUses" > 0); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'constraint InviteCode_positive_max_uses');
  await run(`DO $$ BEGIN ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_valid_use_count" CHECK ("useCount" >= 0 AND "useCount" <= "maxUses"); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'constraint InviteCode_valid_use_count');
  await run(`DO $$ BEGIN ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_purpose_scope" CHECK (("purpose" = 'ACCOUNT' AND "circleId" IS NULL) OR ("purpose" = 'CIRCLE' AND "circleId" IS NOT NULL)); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'constraint InviteCode_purpose_scope');
  // Report constraint: always drop-and-replace with the 5-column version from sprint5
  await run(`ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "Report_exactly_one_target_check"`, 'drop Report constraint');
  await run(`DO $$ BEGIN ALTER TABLE "Report" ADD CONSTRAINT "Report_exactly_one_target_check" CHECK ((CASE WHEN "targetExplorerId" IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN "spotId" IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN "transmissionId" IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN "forumPostId" IS NOT NULL THEN 1 ELSE 0 END + CASE WHEN "forumReplyId" IS NOT NULL THEN 1 ELSE 0 END) = 1); EXCEPTION WHEN duplicate_object THEN null; END $$`, 'constraint Report_exactly_one_target_check');

  // D.12 — Row Level Security (enabling RLS twice is a no-op)
  const rlsTables = [
    'Explorer','Spot','Journey','JourneyLike','Circle','CircleMember',
    'Photo','SpotSave','Transmission','Signal','RefreshToken','InviteCode',
    'InviteUse','AuthToken','TrustEvent','TierEvent','Subscription',
    'ForumPost','ForumReply','JournalPost','AnalyticsEvent','Reaction',
    'SpotVerification','Report','Block','ModerationAction','AuditLog','SpotComment',
  ];
  for (const tbl of rlsTables) {
    await run(`ALTER TABLE public."${tbl}" ENABLE ROW LEVEL SECURITY`, `RLS ${tbl}`);
  }
  await run(`ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY`, 'RLS _prisma_migrations');

  // D.13 — Revoke direct PostgREST / Supabase client access
  await run(`REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated`, 'revoke tables');
  await run(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated`, 'revoke sequences');

  console.log('[ensure-db] Schema repair complete');
  console.log('[ensure-db] Ready');
} finally {
  client.release();
  await pool.end();
}

execSync('npx prisma migrate deploy --schema=prisma/schema.prisma', {
  stdio: 'inherit',
  cwd: ROOT,
});
