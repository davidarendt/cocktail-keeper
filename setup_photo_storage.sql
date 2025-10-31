-- Create storage bucket for cocktail photos
-- Run this in Supabase SQL Editor

-- Create the bucket (if it doesn't exist)
insert into storage.buckets (id, name, public)
values ('cocktail-photos', 'cocktail-photos', true)
on conflict (id) do nothing;

-- Set up RLS policies for the bucket

-- Policy: Allow anonymous users to upload photos (since using password auth, not Supabase auth)
create policy "Allow anonymous uploads"
  on storage.objects
  for insert
  with check (bucket_id = 'cocktail-photos');

-- Policy: Allow anonymous users to update photos
create policy "Allow anonymous updates"
  on storage.objects
  for update
  using (bucket_id = 'cocktail-photos')
  with check (bucket_id = 'cocktail-photos');

-- Policy: Allow anonymous users to delete photos
create policy "Allow anonymous deletes"
  on storage.objects
  for delete
  using (bucket_id = 'cocktail-photos');

-- Policy: Allow public read access (so photos can be displayed)
create policy "Allow public read access"
  on storage.objects
  for select
  using (bucket_id = 'cocktail-photos');

-- Note: Since you're using password auth and not Supabase auth, 
-- you may need to adjust these policies or allow anon access for uploads.
-- If uploads fail with permission errors, you may need to:
-- 1. Allow anon uploads by changing auth.role() to true
-- 2. Or use the service role key for uploads

