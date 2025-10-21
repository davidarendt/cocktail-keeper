-- FIX ADMIN ROLE FOR DAVID
-- Run this in your Supabase SQL Editor

-- First, check what's currently in your profile
SELECT user_id, email, role FROM profiles WHERE email = 'david@ologybrewing.com';

-- Update your existing profile to admin role
UPDATE profiles 
SET role = 'admin' 
WHERE user_id = '0dc4f9b0-bf09-4b54-ad5d-0b455858bc4f';

-- If the above doesn't work, try deleting and recreating:
-- DELETE FROM profiles WHERE user_id = '0dc4f9b0-bf09-4b54-ad5d-0b455858bc4f';
-- INSERT INTO profiles (user_id, email, role) VALUES ('0dc4f9b0-bf09-4b54-ad5d-0b455858bc4f', 'david@ologybrewing.com', 'admin');

-- Verify the change worked
SELECT user_id, email, role FROM profiles WHERE user_id = '0dc4f9b0-bf09-4b54-ad5d-0b455858bc4f';
