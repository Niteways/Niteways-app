-- Create storage bucket for city images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('city-images', 'city-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for city images - public read
CREATE POLICY "City images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'city-images');

-- Create storage policy for city images - authenticated upload
CREATE POLICY "Anyone can upload city images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'city-images');

-- Create storage policy for city images - authenticated update
CREATE POLICY "Anyone can update city images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'city-images');

-- Create storage policy for city images - authenticated delete
CREATE POLICY "Anyone can delete city images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'city-images');