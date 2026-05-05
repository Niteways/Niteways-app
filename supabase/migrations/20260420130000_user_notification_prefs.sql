-- Per-user notification preference toggles (Venue Portal > Settings > Notifications).
-- One row per auth user, RLS-locked so each user can only read/write their own row.
-- Mirrored in supabase/manual/user_notification_prefs_standalone.sql.

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
