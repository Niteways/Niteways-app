-- Phase 1: Guest vs Venue owner routing (Niteways mobile)
-- Apply via Supabase CLI or paste into SQL Editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'guest';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.role IS 'guest | venue_owner — drives mobile app navigation';
COMMENT ON COLUMN public.profiles.venue_id IS 'Venue this owner manages (Phase 2+)';

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.venues.owner_id IS 'Auth user id of venue owner (mobile venue portal)';

CREATE INDEX IF NOT EXISTS idx_venues_owner_id ON public.venues(owner_id);

-- If profile updates fail from the app, ensure RLS allows users to UPDATE their own row:
--   USING (auth.uid() = id) WITH CHECK (auth.uid() = id)
