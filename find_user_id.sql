-- FIND YOUR USER ID
-- Run this query in your Supabase SQL Editor

-- This will find your user ID using your email
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'david@ologybrewing.com';

-- If the above query returns a result, copy the 'id' value
-- Then use it in the admin profile creation below:

-- CREATE YOUR ADMIN PROFILE
-- Replace 'your-user-id-here' with the ID from the query above
-- INSERT INTO profiles (user_id, email, role)
-- VALUES ('your-user-id-here', 'david@ologybrewing.com', 'admin');
