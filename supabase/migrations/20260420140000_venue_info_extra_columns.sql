-- Structured columns used by Venue Portal > More > Venue Info.
-- Mirrored in supabase/manual/venue_info_extra_columns.sql.

ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS opening_hours_json JSONB;

ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6);

ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);
