-- Create special_date_pricing table for realtime sync
CREATE TABLE public.special_date_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  multiplier NUMERIC NOT NULL DEFAULT 1.5,
  tables TEXT[] DEFAULT '{}',
  individual_prices JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(venue_id, date)
);

-- Enable RLS
ALTER TABLE public.special_date_pricing ENABLE ROW LEVEL SECURITY;

-- Create policies for access
CREATE POLICY "Anyone can view special date pricing" 
ON public.special_date_pricing 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage special date pricing" 
ON public.special_date_pricing 
FOR ALL 
USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.special_date_pricing;

-- Also enable realtime for ticket_purchases if not already
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_purchases;