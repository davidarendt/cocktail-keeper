-- CREATE YOUR ADMIN PROFILE
-- Run this in your Supabase SQL Editor

INSERT INTO profiles (user_id, email, role)
VALUES ('0dc4f9b0-bf09-4b54-ad5d-0b455858bc4f', 'david@ologybrewing.com', 'admin');

-- Verify it was created successfully
SELECT user_id, email, role FROM profiles WHERE user_id = '0dc4f9b0-bf09-4b54-ad5d-0b455858bc4f';
