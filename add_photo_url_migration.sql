-- Add photo_url column to cocktails table
ALTER TABLE cocktails ADD COLUMN photo_url TEXT;

-- Create storage bucket for cocktail photos (run this in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('cocktail-photos', 'cocktail-photos', true);

-- Set up RLS policy for photo storage (run this in Supabase dashboard)
-- CREATE POLICY "Users can upload cocktail photos" ON storage.objects
-- FOR INSERT WITH CHECK (bucket_id = 'cocktail-photos' AND auth.role() = 'authenticated');

-- CREATE POLICY "Users can view cocktail photos" ON storage.objects
-- FOR SELECT USING (bucket_id = 'cocktail-photos');

-- CREATE POLICY "Users can delete cocktail photos" ON storage.objects
-- FOR DELETE USING (bucket_id = 'cocktail-photos' AND auth.role() = 'authenticated');
