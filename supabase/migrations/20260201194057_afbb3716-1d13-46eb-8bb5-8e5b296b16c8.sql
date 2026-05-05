-- Add category and expiration_date columns to venue_documents
ALTER TABLE public.venue_documents 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'agreement',
ADD COLUMN IF NOT EXISTS expiration_date date DEFAULT NULL;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_venue_documents_category ON public.venue_documents(category);

-- Create index for expiration date queries
CREATE INDEX IF NOT EXISTS idx_venue_documents_expiration ON public.venue_documents(expiration_date);

-- Create venue_categories table for managing categories
CREATE TABLE IF NOT EXISTS public.venue_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on venue_categories
ALTER TABLE public.venue_categories ENABLE ROW LEVEL SECURITY;

-- Policies for venue_categories
CREATE POLICY "Anyone can view venue categories" 
ON public.venue_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage venue categories" 
ON public.venue_categories 
FOR ALL 
USING (true);

-- Insert default categories based on existing venue categories
INSERT INTO public.venue_categories (name, description)
SELECT DISTINCT category, 
  CASE category
    WHEN 'Nightclub' THEN 'High-energy nightlife venues with DJ performances'
    WHEN 'Rooftop Bar' THEN 'Upscale rooftop venues with scenic views'
    WHEN 'Lounge' THEN 'Relaxed atmosphere with premium cocktails'
    WHEN 'Beach Club' THEN 'Beachfront venues with pool parties'
    WHEN 'Restaurant & Bar' THEN 'Dining venues with nightlife elements'
    ELSE 'Venue category'
  END
FROM public.venues
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (name) DO NOTHING;

-- Add realtime for venue_categories
ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_categories;