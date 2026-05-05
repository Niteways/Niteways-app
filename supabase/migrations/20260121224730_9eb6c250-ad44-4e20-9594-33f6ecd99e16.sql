-- Fix storage policies to allow unauthenticated uploads for demo purposes
-- Drop existing policies if they exist
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Public can view event images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated can upload event images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated can update event images" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated can delete event images" ON storage.objects;
END $$;

-- Create more permissive policies for event-images bucket
CREATE POLICY "Anyone can view event images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'event-images');

CREATE POLICY "Anyone can upload event images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Anyone can update event images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'event-images')
WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Anyone can delete event images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'event-images');