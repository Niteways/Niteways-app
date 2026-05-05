-- Adds google_maps_url to public.venues for the Location section in Venue Info.

ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
