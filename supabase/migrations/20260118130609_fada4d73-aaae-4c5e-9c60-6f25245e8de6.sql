-- Create storage bucket for advertising card images
INSERT INTO storage.buckets (id, name, public)
VALUES ('advertising-images', 'advertising-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for advertising images bucket
CREATE POLICY "Advertising images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'advertising-images');

CREATE POLICY "Authenticated users can upload advertising images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'advertising-images');

CREATE POLICY "Authenticated users can update advertising images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'advertising-images');

CREATE POLICY "Authenticated users can delete advertising images"
ON storage.objects FOR DELETE
USING (bucket_id = 'advertising-images');