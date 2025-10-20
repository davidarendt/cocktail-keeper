-- SIMPLE FIX: Temporarily disable RLS for catalog_items table
-- This is a quick fix for testing, but not recommended for production

-- Disable RLS temporarily (NOT recommended for production)
ALTER TABLE catalog_items DISABLE ROW LEVEL SECURITY;

-- To re-enable RLS later with proper policies, run:
-- ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
-- Then run the policies from fix_catalog_rls.sql
