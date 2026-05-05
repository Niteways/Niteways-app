-- Add image adjustment settings to cities table for precise positioning
ALTER TABLE public.cities 
ADD COLUMN IF NOT EXISTS image_position_x numeric DEFAULT 50,
ADD COLUMN IF NOT EXISTS image_position_y numeric DEFAULT 50,
ADD COLUMN IF NOT EXISTS image_zoom numeric DEFAULT 100;

-- Create a new table for custom venue sections/categories per city
CREATE TABLE IF NOT EXISTS public.city_venue_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  emoji TEXT DEFAULT '🔥',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a junction table to assign venues to sections
CREATE TABLE IF NOT EXISTS public.city_section_venues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.city_venue_sections(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(section_id, venue_id)
);

-- Enable RLS
ALTER TABLE public.city_venue_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_section_venues ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for admin access
CREATE POLICY "Public read city_venue_sections" 
ON public.city_venue_sections 
FOR SELECT 
USING (true);

CREATE POLICY "Public insert city_venue_sections" 
ON public.city_venue_sections 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public update city_venue_sections" 
ON public.city_venue_sections 
FOR UPDATE 
USING (true);

CREATE POLICY "Public delete city_venue_sections" 
ON public.city_venue_sections 
FOR DELETE 
USING (true);

CREATE POLICY "Public read city_section_venues" 
ON public.city_section_venues 
FOR SELECT 
USING (true);

CREATE POLICY "Public insert city_section_venues" 
ON public.city_section_venues 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public update city_section_venues" 
ON public.city_section_venues 
FOR UPDATE 
USING (true);

CREATE POLICY "Public delete city_section_venues" 
ON public.city_section_venues 
FOR DELETE 
USING (true);

-- Add trigger for updated_at
CREATE OR REPLACE TRIGGER update_city_venue_sections_updated_at
BEFORE UPDATE ON public.city_venue_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();