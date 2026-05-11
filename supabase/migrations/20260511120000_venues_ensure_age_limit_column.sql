-- Some Supabase projects skipped older migrations; venue app saves mirror
-- default_age_limit -> age_limit and fails if this column is absent.

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS age_limit INTEGER DEFAULT 21;

COMMENT ON COLUMN public.venues.age_limit IS 'Minimum guest age; mirror default_age_limit when both exist.';

NOTIFY pgrst, 'reload schema';
