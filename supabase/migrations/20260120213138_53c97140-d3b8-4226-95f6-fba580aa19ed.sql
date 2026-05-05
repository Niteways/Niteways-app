-- Fix RLS policies for events table to allow INSERT
CREATE POLICY "Venue team can create events" 
ON public.events 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM venue_team_members 
  WHERE venue_team_members.venue_id = events.venue_id 
  AND venue_team_members.user_id = auth.uid()
));

-- Also add a policy for public INSERT (for admin use - they impersonate venues)
CREATE POLICY "Anyone authenticated can create events" 
ON public.events 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Add start_date and end_date to city_advertising_cards for scheduling
ALTER TABLE public.city_advertising_cards 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Create storage bucket for event images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event images
CREATE POLICY "Event images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated users can upload event images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'event-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update event images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'event-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete event images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'event-images' AND auth.uid() IS NOT NULL);