-- =============================================================================
-- Adds `google_maps_url` column to public.venues.
-- Used by Venue Portal > More > Venue Info > Location > "Google Maps Link".
--
-- Safe to re-run. No backfill.
-- =============================================================================

ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'venues'
    AND column_name = 'google_maps_url';
