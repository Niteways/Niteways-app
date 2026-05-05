-- =============================================================================
-- Paste into Supabase Dashboard → SQL Editor. Safe to re-run (uses IF NOT EXISTS).
--
-- Adds the structured columns used by Venue Portal > More > Venue Info that are
-- NOT in the original venues schema:
--   * opening_hours_json JSONB — per-day schedule { mon:{closed,open,close}, ... }
--   * latitude  NUMERIC(9,6)   — optional map pin latitude
--   * longitude NUMERIC(9,6)   — optional map pin longitude
-- =============================================================================

ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS opening_hours_json JSONB;

ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6);

ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

-- Sanity check: should list all three columns.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'venues'
  AND column_name IN ('opening_hours_json', 'latitude', 'longitude')
ORDER BY column_name;
