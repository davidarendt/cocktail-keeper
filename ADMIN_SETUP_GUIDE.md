# Admin Setup Guide

## The Problem
You're getting permission errors when trying to add units because:
1. Your user profile doesn't exist or doesn't have admin role
2. Row Level Security (RLS) policies are blocking the operation
3. `auth.uid()` returns null when running SQL directly in Supabase editor

## Solution Options

### Option 1: Quick Fix (Recommended for Testing)
Run this in Supabase SQL Editor:
```sql
ALTER TABLE catalog_items DISABLE ROW LEVEL SECURITY;
```
This temporarily disables security so you can add units immediately.

### Option 2: Proper Fix (Recommended for Production)

#### Step 1: Find Your User ID
```sql
-- Replace with your actual email
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

#### Step 2: Create Your Admin Profile
```sql
-- Replace with your actual user ID and email
INSERT INTO profiles (user_id, email, role)
VALUES ('your-user-id-here', 'your-email@example.com', 'admin')
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin';
```

#### Step 3: Set Up RLS Policies
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can insert catalog items" ON catalog_items;
DROP POLICY IF EXISTS "Admins can update catalog items" ON catalog_items;
DROP POLICY IF EXISTS "Admins can delete catalog items" ON catalog_items;
DROP POLICY IF EXISTS "Anyone can read catalog items" ON catalog_items;

-- Create new policies
CREATE POLICY "Admins can insert catalog items" ON catalog_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update catalog items" ON catalog_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete catalog items" ON catalog_items
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Anyone can read catalog items" ON catalog_items
FOR SELECT TO authenticated USING (true);
```

## Verification
After running the fix:
1. Refresh your app
2. Check browser console for role information
3. Try adding a unit - it should work now
4. Verify in Supabase that your profile shows role = 'admin'
