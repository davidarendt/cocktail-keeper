-- QUICK TEST QUERIES
-- Run these in Supabase SQL Editor to verify setup

-- 1. Check your admin profile
SELECT 
  'Admin Profile Check' as test,
  user_id, 
  email, 
  role,
  CASE 
    WHEN role = 'admin' THEN '✅ PASS' 
    ELSE '❌ FAIL - Not admin' 
  END as result
FROM profiles 
WHERE email = 'david@ologybrewing.com';

-- 2. Check default catalog data
SELECT 
  'Catalog Data Check' as test,
  kind,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS' 
    ELSE '❌ FAIL - No data' 
  END as result
FROM catalog_items 
GROUP BY kind
ORDER BY kind;

-- 3. Check default tags
SELECT 
  'Tags Check' as test,
  COUNT(*) as tag_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS' 
    ELSE '❌ FAIL - No tags' 
  END as result
FROM tags;

-- 4. Check RLS policies
SELECT 
  'RLS Policies Check' as test,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS' 
    ELSE '❌ FAIL - No policies' 
  END as result
FROM pg_policies 
WHERE schemaname = 'public';

-- 5. Check database functions
SELECT 
  'Database Functions Check' as test,
  routine_name,
  CASE 
    WHEN routine_name IS NOT NULL THEN '✅ PASS' 
    ELSE '❌ FAIL - Function missing' 
  END as result
FROM information_schema.routines 
WHERE routine_name IN ('handle_new_user', 'update_user_role', 'get_all_users')
ORDER BY routine_name;

-- 6. Test user role update function (safe test)
SELECT 
  'Role Update Function Test' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'update_user_role'
    ) THEN '✅ PASS - Function exists' 
    ELSE '❌ FAIL - Function missing' 
  END as result;

-- 7. Check table structure
SELECT 
  'Table Structure Check' as test,
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ PASS' 
    ELSE '❌ FAIL - Table missing' 
  END as result
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'cocktails', 'ingredients', 'tags', 'catalog_items', 'recipe_ingredients', 'cocktail_tags')
ORDER BY table_name;
