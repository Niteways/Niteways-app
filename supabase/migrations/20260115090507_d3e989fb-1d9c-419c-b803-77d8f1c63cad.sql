-- Add image_url column to cities table for city header images
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS image_url TEXT;