-- IMMEDIATE FIX FOR ADMIN ROLE
-- Run this in your Supabase SQL Editor right now

-- 1. First, check what's currently in your profile
SELECT user_id, email, role FROM profiles WHERE email = 'david@ologybrewing.com';

-- 2. Update your role to admin
UPDATE profiles 
SET role = 'admin' 
WHERE user_id = '0dc4f9b0-bf09-4b54-ad5d-0b455858bc4f';

-- 3. Verify the change worked
SELECT user_id, email, role FROM profiles WHERE user_id = '0dc4f9b0-bf09-4b54-ad5d-0b455858bc4f';

-- 4. If the above doesn't work, try this alternative:
-- DELETE FROM profiles WHERE user_id = '0dc4f9b0-bf09-4b54-ad5d-0b455858bc4f';
-- INSERT INTO profiles (user_id, email, role) VALUES ('0dc4f9b0-bf09-4b54-ad5d-0b455858bc4f', 'david@ologybrewing.com', 'admin');
