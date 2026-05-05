-- Create events table for venues to create events
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TEXT,
  description TEXT,
  image_url TEXT,
  ticket_price NUMERIC(10,2),
  ticket_types JSONB DEFAULT '[]',
  capacity INTEGER,
  tickets_sold INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'cancelled', 'completed')),
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user favorites table
CREATE TABLE public.user_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, venue_id)
);

-- Enable RLS on both tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Events policies - public can view active events
CREATE POLICY "Anyone can view active events"
ON public.events
FOR SELECT
USING (status = 'active');

-- Events policies - venue team members can manage their venue's events
CREATE POLICY "Venue team can manage events"
ON public.events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.venue_team_members
    WHERE venue_team_members.venue_id = events.venue_id
    AND venue_team_members.user_id = auth.uid()
  )
);

-- User favorites policies
CREATE POLICY "Users can view their own favorites"
ON public.user_favorites
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
ON public.user_favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites"
ON public.user_favorites
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for events
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;

-- Create indexes for better performance
CREATE INDEX idx_events_venue_id ON public.events(venue_id);
CREATE INDEX idx_events_event_date ON public.events(event_date);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX idx_user_favorites_venue_id ON public.user_favorites(venue_id);

-- Insert some sample events
INSERT INTO public.events (venue_id, event_name, event_date, event_time, description, ticket_price, capacity, featured)
SELECT 
  id,
  'Friday Night Live',
  CURRENT_DATE + INTERVAL '3 days',
  '22:00',
  'The hottest Friday night party featuring top DJs and amazing vibes.',
  50.00,
  500,
  true
FROM public.venues
WHERE status = 'active'
LIMIT 3;

INSERT INTO public.events (venue_id, event_name, event_date, event_time, description, ticket_price, capacity)
SELECT 
  id,
  'Saturday Sessions',
  CURRENT_DATE + INTERVAL '4 days',
  '23:00',
  'Weekly Saturday session with resident DJs and special guests.',
  40.00,
  400
FROM public.venues
WHERE status = 'active'
LIMIT 3;

INSERT INTO public.events (venue_id, event_name, event_date, event_time, description, ticket_price, capacity)
SELECT 
  id,
  'Sunday Brunch & Beats',
  CURRENT_DATE + INTERVAL '5 days',
  '14:00',
  'Daytime party with brunch packages and chill house music.',
  75.00,
  200
FROM public.venues
WHERE status = 'active'
LIMIT 2;