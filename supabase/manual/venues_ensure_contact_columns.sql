-- Manual patch: add email + phone columns to public.venues if missing.
-- Paste this whole block into the Supabase SQL editor and run once.
-- Safe to re-run (uses IF NOT EXISTS).

ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS phone TEXT;

-- Sanity check: should list both columns.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'venues'
  AND column_name IN ('email', 'phone');
