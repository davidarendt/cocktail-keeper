-- Fix RLS policies to allow anonymous access (for password authentication)
-- Run this in Supabase SQL Editor
-- Since you're using password auth (not Supabase auth), we need to allow anonymous operations

-- ==============================================
-- 1. COCKTAILS - Allow anonymous insert/update
-- ==============================================

-- Drop existing policies that require authentication
DROP POLICY IF EXISTS "Editors and admins can insert cocktails" ON cocktails;
DROP POLICY IF EXISTS "Editors and admins can update cocktails" ON cocktails;
DROP POLICY IF EXISTS "Admins can delete cocktails" ON cocktails;

-- Create new policies that allow anonymous access
CREATE POLICY "Allow anonymous insert cocktails" ON cocktails
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow anonymous update cocktails" ON cocktails
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anonymous delete cocktails" ON cocktails
FOR DELETE
USING (true);

-- ==============================================
-- 2. RECIPE_INGREDIENTS - Allow anonymous operations
-- ==============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Editors and admins can manage recipe ingredients" ON recipe_ingredients;

-- Create new policies
CREATE POLICY "Allow anonymous manage recipe ingredients" ON recipe_ingredients
FOR ALL
USING (true)
WITH CHECK (true);

-- ==============================================
-- 3. COCKTAIL_TAGS - Allow anonymous operations
-- ==============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Editors and admins can manage cocktail tags" ON cocktail_tags;

-- Create new policies
CREATE POLICY "Allow anonymous manage cocktail tags" ON cocktail_tags
FOR ALL
USING (true)
WITH CHECK (true);

-- ==============================================
-- 4. INGREDIENTS - Allow anonymous insert/update/delete
-- ==============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Editors and admins can insert ingredients" ON ingredients;
DROP POLICY IF EXISTS "Admins can update ingredients" ON ingredients;
DROP POLICY IF EXISTS "Admins can delete ingredients" ON ingredients;

-- Create new policies
CREATE POLICY "Allow anonymous insert ingredients" ON ingredients
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow anonymous update ingredients" ON ingredients
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anonymous delete ingredients" ON ingredients
FOR DELETE
USING (true);

-- ==============================================
-- 5. TAGS - Allow anonymous operations
-- ==============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage tags" ON tags;

-- Create new policies
CREATE POLICY "Allow anonymous manage tags" ON tags
FOR ALL
USING (true)
WITH CHECK (true);

-- ==============================================
-- 6. CATALOG_ITEMS - Allow anonymous operations
-- ==============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage catalog items" ON catalog_items;

-- Create new policies
CREATE POLICY "Allow anonymous manage catalog items" ON catalog_items
FOR ALL
USING (true)
WITH CHECK (true);

-- ==============================================
-- 7. STORAGE - Make sure bucket policies allow anonymous access
-- ==============================================

-- Drop existing storage policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Create anonymous storage policies
CREATE POLICY "Allow anonymous uploads cocktail-photos" ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'cocktail-photos');

CREATE POLICY "Allow anonymous updates cocktail-photos" ON storage.objects
FOR UPDATE
USING (bucket_id = 'cocktail-photos')
WITH CHECK (bucket_id = 'cocktail-photos');

CREATE POLICY "Allow anonymous deletes cocktail-photos" ON storage.objects
FOR DELETE
USING (bucket_id = 'cocktail-photos');

-- Public read access (drop and recreate to ensure it exists)
DROP POLICY IF EXISTS "Allow public read cocktail-photos" ON storage.objects;
CREATE POLICY "Allow public read cocktail-photos" ON storage.objects
FOR SELECT
USING (bucket_id = 'cocktail-photos');

-- ==============================================
-- 8. BATCHED_ITEMS - Allow anonymous operations
-- ==============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON batched_items;

-- Create new policies
CREATE POLICY "Allow anonymous manage batched_items" ON batched_items
FOR ALL
USING (true)
WITH CHECK (true);

