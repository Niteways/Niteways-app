-- =============================================================================
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor for the project
-- configured in mobile-app/src/config/supabase.ts (URL must match that project).
--
-- Creates the per-user notification preferences table used by
-- Settings → Notifications in the Venue Portal. One row per auth user.
--
-- If the editor shows "Success. No rows returned", that is NORMAL — DDL does
-- not return rows. Only a red error means something failed.
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_notification_prefs (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  new_booking_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  vip_guest_arrivals BOOLEAN NOT NULL DEFAULT TRUE,
  security_alerts    BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notification prefs" ON public.user_notification_prefs;
CREATE POLICY "Users read own notification prefs"
  ON public.user_notification_prefs
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own notification prefs" ON public.user_notification_prefs;
CREATE POLICY "Users insert own notification prefs"
  ON public.user_notification_prefs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notification prefs" ON public.user_notification_prefs;
CREATE POLICY "Users update own notification prefs"
  ON public.user_notification_prefs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Keep updated_at fresh on any UPDATE.
CREATE OR REPLACE FUNCTION public.user_notification_prefs_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_notification_prefs_updated_at ON public.user_notification_prefs;
CREATE TRIGGER trg_user_notification_prefs_updated_at
  BEFORE UPDATE ON public.user_notification_prefs
  FOR EACH ROW
  EXECUTE FUNCTION public.user_notification_prefs_touch_updated_at();

-- Sanity check: should list one row with all 4 columns.
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_notification_prefs'
ORDER BY ordinal_position;
