-- CORRECTED FIX FOR ADMIN PERMISSIONS
-- The auth.uid() function returns null when running SQL directly in Supabase editor
-- Use this approach instead:

-- Step 1: First, find your user ID from the auth.users table
-- Replace 'your-email@example.com' with your actual email address
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Step 2: Once you have your user ID, use it directly in the INSERT statement
-- Replace 'your-user-id-here' with the ID from step 1
INSERT INTO profiles (user_id, email, role)
VALUES ('your-user-id-here', 'your-email@example.com', 'admin')
ON CONFLICT (user_id) 
DO UPDATE SET 
  email = EXCLUDED.email,
  role = 'admin';

-- Step 3: Verify your profile was created/updated
SELECT user_id, email, role FROM profiles WHERE user_id = 'your-user-id-here';

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
-- This should work now if you're logged in as the admin user
-- INSERT INTO catalog_items (kind, name, position, active) VALUES ('unit', 'test_unit', 1, true);
