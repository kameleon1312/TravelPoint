-- RLS lockdown for TravelPoint
-- All data access goes through the Fastify API (Prisma as superuser, bypasses RLS).
-- Enabling RLS without permissive policies blocks direct PostgREST / GraphQL / anon
-- access while leaving Prisma completely unaffected.

-- ── Enable RLS on every application table ───────────────────────────────────
ALTER TABLE public."Explorer"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Spot"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Journey"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."JourneyLike"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Circle"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CircleMember"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Photo"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SpotSave"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Transmission"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Signal"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RefreshToken"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."InviteCode"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."InviteUse"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuthToken"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TrustEvent"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TierEvent"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Subscription"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ForumPost"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ForumReply"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."JournalPost"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AnalyticsEvent"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Reaction"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SpotVerification"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Report"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Block"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ModerationAction"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuditLog"          ENABLE ROW LEVEL SECURITY;

-- Prisma migrations table — no application code should access this via PostgREST
ALTER TABLE public._prisma_migrations  ENABLE ROW LEVEL SECURITY;

-- ── Strip all table / sequence / function grants from Supabase roles ─────────
-- anon    = unauthenticated Supabase clients
-- authenticated = Supabase JWT-authed clients
-- Neither is used by TravelPoint; all access goes through the Fastify API.
REVOKE ALL ON ALL TABLES     IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES  IN SCHEMA public FROM anon, authenticated;

-- ── Tighten custom SECURITY DEFINER functions ────────────────────────────────
-- Fix mutable search_path (Advisor: "Function Search Path Mutable")
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'tp_like_post'
  ) THEN
    ALTER FUNCTION public.tp_like_post(uuid, uuid) SET search_path = public, pg_catalog;
    REVOKE EXECUTE ON FUNCTION public.tp_like_post(uuid, uuid) FROM anon, authenticated, PUBLIC;
  END IF;
END $$;

-- handle_new_user is a Supabase Auth trigger not used by TravelPoint (custom auth)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
  END IF;
END $$;
