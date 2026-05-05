-- =============================================================================
-- Creates the public "venue-menus" Supabase Storage bucket used by
-- Venue Portal > More > Venue Info > Links & Media > Menu PDF (Upload Menu).
--
-- Run ONCE in Supabase Dashboard → SQL Editor. Safe to re-run.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-menus', 'venue-menus', TRUE)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "venue-menus public read" ON storage.objects;
CREATE POLICY "venue-menus public read"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'venue-menus');

DROP POLICY IF EXISTS "venue-menus auth insert" ON storage.objects;
CREATE POLICY "venue-menus auth insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'venue-menus');

DROP POLICY IF EXISTS "venue-menus auth update" ON storage.objects;
CREATE POLICY "venue-menus auth update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'venue-menus')
    WITH CHECK (bucket_id = 'venue-menus');

DROP POLICY IF EXISTS "venue-menus auth delete" ON storage.objects;
CREATE POLICY "venue-menus auth delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'venue-menus');

SELECT id, name, public FROM storage.buckets WHERE id = 'venue-menus';
