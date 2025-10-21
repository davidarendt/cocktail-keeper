-- SETUP USER REGISTRATION AND ROLE MANAGEMENT
-- This enables users to register with email/password and admins to manage roles

-- 1. Enable email/password authentication in Supabase Dashboard:
-- Go to Authentication → Settings → Auth Providers
-- Enable "Email" provider
-- You can disable "Magic Link" if you want

-- 2. Create a function to automatically create profiles for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (new.id, new.email, 'viewer');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger to automatically create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Create function for admins to update user roles
CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id UUID, new_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can update user roles';
  END IF;
  
  -- Update the target user's role
  UPDATE profiles 
  SET role = new_role 
  WHERE user_id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to get all users (for admin management)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can view all users';
  END IF;
  
  RETURN QUERY
  SELECT p.user_id, p.email, p.role, p.created_at
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create your admin profile (if not exists)
INSERT INTO profiles (user_id, email, role)
VALUES ('0dc4f9b0-bf09-4b54-ad5d-0b455858bc4f', 'david@ologybrewing.com', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- 7. Test the setup
SELECT 'Setup complete! Users can now register and admins can manage roles.' as status;
