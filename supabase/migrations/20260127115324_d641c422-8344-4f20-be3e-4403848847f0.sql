-- 1) Persisted geocoding for venues (map pins)
ALTER TABLE public.venues
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric,
ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;

-- 2) Drag/drop ordering for tables
ALTER TABLE public.venue_tables
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_venue_tables_venue_sort
ON public.venue_tables (venue_id, sort_order, label);

-- 3) Venue documents metadata (files stored in object storage; DB stores only references)
CREATE TABLE IF NOT EXISTS public.venue_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid
);

ALTER TABLE public.venue_documents ENABLE ROW LEVEL SECURITY;

-- Read: authenticated users (venue portal) + admins
DROP POLICY IF EXISTS "Authenticated can view venue documents" ON public.venue_documents;
CREATE POLICY "Authenticated can view venue documents"
ON public.venue_documents
FOR SELECT
TO authenticated
USING (true);

-- Write: admins only
DROP POLICY IF EXISTS "Admins can manage venue documents" ON public.venue_documents;
CREATE POLICY "Admins can manage venue documents"
ON public.venue_documents
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 4) Storage bucket for venue documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-documents', 'venue-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
-- Allow authenticated users to read documents
DROP POLICY IF EXISTS "Authenticated can read venue documents" ON storage.objects;
CREATE POLICY "Authenticated can read venue documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'venue-documents');

-- Allow admins full access
DROP POLICY IF EXISTS "Admins can manage venue documents objects" ON storage.objects;
CREATE POLICY "Admins can manage venue documents objects"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'venue-documents' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'venue-documents' AND public.is_admin(auth.uid()));

-- 5) Enable realtime for venue_documents and venue_tables ordering updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_tables;