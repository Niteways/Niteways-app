-- Create venue_tickets table for venue-level tickets (not tied to events)
CREATE TABLE public.venue_tickets (
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.venue_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view venue tickets" 
ON public.venue_tickets 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage venue tickets" 
ON public.venue_tickets 
FOR ALL 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_venue_tickets_updated_at
BEFORE UPDATE ON public.venue_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for venue_tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_tickets;