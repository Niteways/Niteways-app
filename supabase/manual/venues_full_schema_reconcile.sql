-- =============================================================================
-- ONE-PASTE SCHEMA RECONCILE for drifted Supabase projects.
-- Run this ONCE in Supabase Dashboard → SQL Editor.
-- Safe to re-run (every statement is IF NOT EXISTS).
--
-- Adds every column on public.venues and public.cities that the mobile-app
-- Venue Portal expects. If a column already exists it is left untouched.
-- =============================================================================

-- ---------- public.cities ----------------------------------------------------
ALTER TABLE public.cities
    ADD COLUMN IF NOT EXISTS name      TEXT,
    ADD COLUMN IF NOT EXISTS country   TEXT,
    ADD COLUMN IF NOT EXISTS timezone  TEXT DEFAULT 'Europe/London',
    ADD COLUMN IF NOT EXISTS currency  TEXT DEFAULT 'EUR',
    ADD COLUMN IF NOT EXISTS tax_rate  NUMERIC(5,2) DEFAULT 20.00,
    ADD COLUMN IF NOT EXISTS status    TEXT DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS venue_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ---------- public.venues ----------------------------------------------------
ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS name                 TEXT,
    ADD COLUMN IF NOT EXISTS venue_id             TEXT,
    ADD COLUMN IF NOT EXISTS city_id              UUID,
    ADD COLUMN IF NOT EXISTS category             TEXT DEFAULT 'Nightclub',
    ADD COLUMN IF NOT EXISTS address              TEXT,
    ADD COLUMN IF NOT EXISTS phone                TEXT,
    ADD COLUMN IF NOT EXISTS email                TEXT,
    ADD COLUMN IF NOT EXISTS description          TEXT,
    ADD COLUMN IF NOT EXISTS music_genre          TEXT,
    ADD COLUMN IF NOT EXISTS opening_hours        TEXT,
    ADD COLUMN IF NOT EXISTS opening_days         TEXT,
    ADD COLUMN IF NOT EXISTS entrance_rules       TEXT,
    ADD COLUMN IF NOT EXISTS default_age_limit    INTEGER,
    ADD COLUMN IF NOT EXISTS day_specific_ages    JSONB,
    ADD COLUMN IF NOT EXISTS dress_code           TEXT,
    ADD COLUMN IF NOT EXISTS spotify_link         TEXT,
    ADD COLUMN IF NOT EXISTS instagram_handle     TEXT,
    ADD COLUMN IF NOT EXISTS menu_url             TEXT,
    ADD COLUMN IF NOT EXISTS google_maps_url      TEXT,
    ADD COLUMN IF NOT EXISTS gallery_images       TEXT[],
    ADD COLUMN IF NOT EXISTS opening_hours_json   JSONB,
    ADD COLUMN IF NOT EXISTS latitude             NUMERIC(9,6),
    ADD COLUMN IF NOT EXISTS longitude            NUMERIC(9,6),
    ADD COLUMN IF NOT EXISTS status               TEXT DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS base_package         TEXT DEFAULT 'starter',
    ADD COLUMN IF NOT EXISTS addons               TEXT[] DEFAULT ARRAY[]::text[],
    ADD COLUMN IF NOT EXISTS timezone             TEXT,
    ADD COLUMN IF NOT EXISTS booking_cutoff_hours INTEGER DEFAULT 2,
    ADD COLUMN IF NOT EXISTS max_advance_days     INTEGER DEFAULT 30,
    ADD COLUMN IF NOT EXISTS cancellation_policy  TEXT,
    ADD COLUMN IF NOT EXISTS deposit_percent      NUMERIC(5,2) DEFAULT 20.00,
    ADD COLUMN IF NOT EXISTS min_spend_tables     NUMERIC(10,2) DEFAULT 500.00,
    ADD COLUMN IF NOT EXISTS min_spend_vip        NUMERIC(10,2) DEFAULT 1500.00,
    ADD COLUMN IF NOT EXISTS created_at           TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ DEFAULT now();

-- Force PostgREST to reload its in-memory schema cache immediately so the
-- Supabase REST API sees the new columns without waiting for the auto-reload.
NOTIFY pgrst, 'reload schema';

-- Sanity check (expect 30+ rows for venues and ~8 for cities).
SELECT table_name, COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('venues', 'cities')
GROUP BY table_name
ORDER BY table_name;
