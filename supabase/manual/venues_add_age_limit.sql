-- Run once in Supabase Dashboard → SQL Editor if the venue app shows:
-- "columns are missing from your venues table: age_limit"
--
-- Safe to re-run (IF NOT EXISTS).

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS age_limit INTEGER DEFAULT 21;

COMMENT ON COLUMN public.venues.age_limit IS 'Minimum guest age; mirror default_age_limit when both exist.';

NOTIFY pgrst, 'reload schema';
