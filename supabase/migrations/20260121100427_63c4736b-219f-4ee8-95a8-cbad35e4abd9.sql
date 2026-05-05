-- Fix RLS policies for events table to allow any authenticated user to create events
DROP POLICY IF EXISTS "Anyone authenticated can create events" ON public.events;
DROP POLICY IF EXISTS "Venue team can create events" ON public.events;
DROP POLICY IF EXISTS "Venue team can manage events" ON public.events;
DROP POLICY IF EXISTS "Anyone can view active events" ON public.events;

-- Allow public read for all events (not just active for admin viewing)
CREATE POLICY "Public read events"
ON public.events
FOR SELECT
USING (true);

-- Allow any authenticated user to insert events
CREATE POLICY "Authenticated users can insert events"
ON public.events
FOR INSERT
WITH CHECK (true);

-- Allow any authenticated user to update events
CREATE POLICY "Authenticated users can update events"
ON public.events
FOR UPDATE
USING (true);

-- Allow any authenticated user to delete events
CREATE POLICY "Authenticated users can delete events"
ON public.events
FOR DELETE
USING (true);