-- Fix Row Level Security policies for catalog_items table
-- Run these commands in your Supabase SQL editor

-- First, let's check the current policies
SELECT * FROM pg_policies WHERE tablename = 'catalog_items';

-- Enable RLS if not already enabled (this should already be done)
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows admins to insert catalog items
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

-- Create a policy that allows admins to update catalog items
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

-- Create a policy that allows admins to delete catalog items
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

-- Create a policy that allows everyone to read catalog items
CREATE POLICY "Anyone can read catalog items" ON catalog_items
FOR SELECT 
TO authenticated
USING (true);

-- If the above policies already exist, you might need to drop them first:
-- DROP POLICY IF EXISTS "Admins can insert catalog items" ON catalog_items;
-- DROP POLICY IF EXISTS "Admins can update catalog items" ON catalog_items;
-- DROP POLICY IF EXISTS "Admins can delete catalog items" ON catalog_items;
-- DROP POLICY IF EXISTS "Anyone can read catalog items" ON catalog_items;
