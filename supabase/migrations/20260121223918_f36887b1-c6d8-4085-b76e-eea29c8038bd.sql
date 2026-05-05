-- Fix event media persistence + enable authenticated uploads to the event-images bucket

-- 1) Persist event gallery + key metadata
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS gallery_images text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS age_limit integer NOT NULL DEFAULT 21,
  ADD COLUMN IF NOT EXISTS music_genre text;

-- 2) Storage RLS policies for event image uploads (flyer + gallery)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can view event images'
  ) THEN
    CREATE POLICY "Public can view event images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'event-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can upload event images'
  ) THEN
    CREATE POLICY "Authenticated can upload event images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'event-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can update event images'
  ) THEN
    CREATE POLICY "Authenticated can update event images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'event-images')
    WITH CHECK (bucket_id = 'event-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can delete event images'
  ) THEN
    CREATE POLICY "Authenticated can delete event images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'event-images');
  END IF;
END $$;