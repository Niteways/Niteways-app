-- Adds default_age_limit, day_specific_ages, dress_code columns to public.venues
-- for the Entrance Rules section in Venue Info.

ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS default_age_limit INTEGER;

ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS day_specific_ages JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS dress_code TEXT;
