-- SETUP EMAIL + PASSWORD AUTHENTICATION
-- This allows users to sign in with email and password instead of magic links

-- 1. Enable email/password authentication in Supabase Dashboard:
-- Go to Authentication → Settings → Auth Providers
-- Enable "Email" provider
-- Disable "Magic Link" if you want to remove it completely

-- 2. Create a test admin user with password
-- This creates a user account with a password you can use for testing
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '0dc4f9b0-bf09-4b54-ad5d-0b455858bc4f',
  'authenticated',
  'authenticated',
  'david@ologybrewing.com',
  crypt('your-password-here', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- 3. Create the corresponding profile
INSERT INTO profiles (user_id, email, role)
VALUES ('0dc4f9b0-bf09-4b54-ad5d-0b455858bc4f', 'david@ologybrewing.com', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- 4. Verify the setup
SELECT user_id, email, role FROM profiles WHERE email = 'david@ologybrewing.com';
