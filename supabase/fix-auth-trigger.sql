-- ============================================================
-- TravelPoint — Fix: Drop conflicting auth.users trigger
-- Uruchom w: Supabase Dashboard → SQL Editor
-- ============================================================

-- Sprawdź jakie triggery istnieją na auth.users
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- Usuń standardowy Supabase trigger (tworzy profil w public.profiles).
-- TravelPoint używa własnego endpointu /api/auth/complete-signup
-- zamiast tego triggera — jest zbędny i blokuje rejestrację.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Usuń też funkcję handle_new_user jeśli istnieje (nie jest używana)
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Potwierdź — powinno zwrócić 0 wierszy
SELECT
  trigger_name
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';
