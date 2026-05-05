-- Run this in Supabase Dashboard → SQL Editor for the SAME project as mobile-app/src/config/supabase.ts
-- Fixes: "Could not find the table 'public.venue_tickets' in the schema cache"
-- Safe to run more than once (idempotent where possible).

-- Trigger helper (required by venue_tickets updated_at trigger)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.venue_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 100,
  sold INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  type TEXT NOT NULL DEFAULT 'regular',
  description TEXT,
  active_days TEXT[] DEFAULT ARRAY['friday', 'saturday']::TEXT[],
  specific_dates DATE[],
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.venue_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view venue tickets" ON public.venue_tickets;
CREATE POLICY "Anyone can view venue tickets"
  ON public.venue_tickets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage venue tickets" ON public.venue_tickets;
CREATE POLICY "Authenticated users can manage venue tickets"
  ON public.venue_tickets FOR ALL USING (true);

DROP TRIGGER IF EXISTS update_venue_tickets_updated_at ON public.venue_tickets;
CREATE TRIGGER update_venue_tickets_updated_at
  BEFORE UPDATE ON public.venue_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime (ignore failure if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_tickets;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
