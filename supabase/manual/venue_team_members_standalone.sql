-- =============================================================================
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor for the project
-- configured in mobile-app/src/config/supabase.ts (URL must match that project).
-- Then wait ~30 seconds and fully reload the mobile app.
--
-- This script is idempotent — safe to run multiple times. It:
--   1. Creates public.venue_team_members if missing.
--   2. Ensures all expected columns exist (for older installs).
--   3. Replaces RLS policies with permissive ones so the venue portal app can
--      CRUD team members without an admin-only role.
--   4. Adds the table to the `supabase_realtime` publication.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.venue_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  permissions JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  avatar_url TEXT,
  invited_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(venue_id, email)
);

-- Backfill any missing columns for older installs.
ALTER TABLE public.venue_team_members
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_venue_team_members_venue ON public.venue_team_members(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_team_members_status ON public.venue_team_members(status);

ALTER TABLE public.venue_team_members ENABLE ROW LEVEL SECURITY;

-- Drop any pre-existing policies (admin-only or otherwise) and re-create permissive ones.
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'venue_team_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.venue_team_members', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Public read venue_team_members"
  ON public.venue_team_members FOR SELECT USING (true);
CREATE POLICY "Public insert venue_team_members"
  ON public.venue_team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update venue_team_members"
  ON public.venue_team_members FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete venue_team_members"
  ON public.venue_team_members FOR DELETE USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'venue_team_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_team_members;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
