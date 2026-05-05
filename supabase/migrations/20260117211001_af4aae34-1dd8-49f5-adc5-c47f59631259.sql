-- Create table for city advertising cards
CREATE TABLE public.city_advertising_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  link_url TEXT,
  background_color TEXT DEFAULT '#1a1a1a',
  text_color TEXT DEFAULT '#ffffff',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  position_after_section UUID REFERENCES public.city_venue_sections(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on advertising cards
ALTER TABLE public.city_advertising_cards ENABLE ROW LEVEL SECURITY;

-- RLS policies for advertising cards
CREATE POLICY "Advertising cards are viewable by everyone"
ON public.city_advertising_cards FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage advertising cards"
ON public.city_advertising_cards FOR ALL
USING (true);

-- Enable realtime for advertising cards
ALTER PUBLICATION supabase_realtime ADD TABLE public.city_advertising_cards;