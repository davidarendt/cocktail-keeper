-- COMPREHENSIVE FIX FOR ADMIN PERMISSIONS
-- Run these commands in your Supabase SQL Editor

-- Step 1: Check if you have a profile record
-- If the query below returns no results, you need to create a profile
SELECT user_id, email, role FROM profiles WHERE user_id = auth.uid();

-- Step 2: Create or update your profile to admin role
-- Replace 'your-email@example.com' with your actual email
INSERT INTO profiles (user_id, email, role)
VALUES (auth.uid(), auth.email(), 'admin')
ON CONFLICT (user_id) 
DO UPDATE SET 
  email = EXCLUDED.email,
  role = 'admin';

-- Step 3: Verify your profile was created/updated
SELECT user_id, email, role FROM profiles WHERE user_id = auth.uid();

-- Step 4: Drop any existing policies on catalog_items (to start fresh)
DROP POLICY IF EXISTS "Admins can insert catalog items" ON catalog_items;
DROP POLICY IF EXISTS "Admins can update catalog items" ON catalog_items;
DROP POLICY IF EXISTS "Admins can delete catalog items" ON catalog_items;
DROP POLICY IF EXISTS "Anyone can read catalog items" ON catalog_items;

-- Step 5: Create new RLS policies
-- Allow admins to insert catalog items
CREATE POLICY "Admins can insert catalog items" ON catalog_items
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Allow admins to update catalog items
CREATE POLICY "Admins can update catalog items" ON catalog_items
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Allow admins to delete catalog items
CREATE POLICY "Admins can delete catalog items" ON catalog_items
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Allow everyone to read catalog items
CREATE POLICY "Anyone can read catalog items" ON catalog_items
FOR SELECT 
TO authenticated
USING (true);

-- Step 6: Test the policies by trying to insert a test record
-- Uncomment the line below to test:
-- INSERT INTO catalog_items (kind, name, position, active) VALUES ('unit', 'test_unit', 1, true);

-- Step 7: If the test insert works, clean up the test record
-- DELETE FROM catalog_items WHERE name = 'test_unit' AND kind = 'unit';
