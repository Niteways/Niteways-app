-- =============================================================================
-- Creates the public "venue-gallery" storage bucket used by
-- Venue Portal > More > Venue Info > Basic Information > Photos.
--
-- Run ONCE in Supabase Dashboard → SQL Editor. Safe to re-run.
-- =============================================================================

-- 1) Create the bucket (public so URLs are directly viewable in the guest app).
INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-gallery', 'venue-gallery', TRUE)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 2) Policies. We intentionally keep these permissive for authenticated users so
--    any signed-in venue owner can manage their own venue's photos. Tighten
--    later if you want per-venue-folder scoping (requires joining venues.owner_id
--    to the storage path).

DROP POLICY IF EXISTS "venue-gallery public read" ON storage.objects;
CREATE POLICY "venue-gallery public read"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'venue-gallery');

DROP POLICY IF EXISTS "venue-gallery auth insert" ON storage.objects;
CREATE POLICY "venue-gallery auth insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'venue-gallery');

DROP POLICY IF EXISTS "venue-gallery auth update" ON storage.objects;
CREATE POLICY "venue-gallery auth update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'venue-gallery')
    WITH CHECK (bucket_id = 'venue-gallery');

DROP POLICY IF EXISTS "venue-gallery auth delete" ON storage.objects;
CREATE POLICY "venue-gallery auth delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'venue-gallery');

-- Sanity check: bucket should be listed as public.
SELECT id, name, public FROM storage.buckets WHERE id = 'venue-gallery';
