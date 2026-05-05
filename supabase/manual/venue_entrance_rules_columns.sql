-- =============================================================================
-- Adds columns powering Venue Portal > More > Venue Info > Entrance Rules.
-- Safe to re-run. No data loss.
-- =============================================================================

ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS default_age_limit INTEGER;

ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS day_specific_ages JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS dress_code TEXT;

-- Sanity check.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'venues'
    AND column_name IN ('default_age_limit', 'day_specific_ages', 'dress_code')
ORDER BY column_name;
