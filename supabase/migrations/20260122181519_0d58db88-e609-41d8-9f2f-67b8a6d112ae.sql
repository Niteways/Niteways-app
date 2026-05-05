-- Add custom_tags column to events table for per-event tags (e.g., Special Guest, Dress Code)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS custom_tags TEXT[] DEFAULT ARRAY[]::TEXT[];