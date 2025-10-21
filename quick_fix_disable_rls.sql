-- QUICK FIX: Temporarily disable RLS for testing
-- This is the fastest way to get units working

-- Disable RLS on catalog_items table
ALTER TABLE catalog_items DISABLE ROW LEVEL SECURITY;

-- Now you should be able to add units without permission issues
-- Try adding a unit in your app now

-- IMPORTANT: This removes security, so only use for testing
-- To re-enable security later, run:
-- ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
-- Then set up proper RLS policies
