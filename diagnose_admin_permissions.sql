-- DIAGNOSE ADMIN PERMISSIONS
-- Run these queries in your Supabase SQL Editor to diagnose the issue

-- 1. Check if you have a profile record
SELECT 
  user_id, 
  email, 
  role, 
  created_at 
FROM profiles 
WHERE user_id = auth.uid();

-- 2. Check all profiles (to see what roles exist)
SELECT 
  user_id, 
  email, 
  role, 
  created_at 
FROM profiles 
ORDER BY created_at;

-- 3. Check current user info
SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_email;

-- 4. Check if catalog_items table has RLS enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'catalog_items';

-- 5. Check existing RLS policies on catalog_items
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE tablename = 'catalog_items';

-- 6. Test if you can insert a test record (this will show the exact error)
-- Uncomment the line below to test:
-- INSERT INTO catalog_items (kind, name, position, active) VALUES ('unit', 'test_unit', 1, true);
