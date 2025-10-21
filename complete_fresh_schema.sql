-- COMPLETE FRESH SCHEMA FOR COCKTAIL KEEPER
-- Run this in your Supabase SQL Editor to create everything from scratch

-- ==============================================
-- 1. DROP EXISTING TABLES (if they exist)
-- ==============================================
DROP TABLE IF EXISTS cocktail_tags CASCADE;
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS cocktail_tags CASCADE;
DROP TABLE IF EXISTS cocktails CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS catalog_items CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ==============================================
-- 2. CREATE TABLES
-- ==============================================

-- Profiles table (user roles)
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ingredients table
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Catalog items table (methods, glasses, ice, garnishes, units)
CREATE TABLE catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('method', 'glass', 'ice', 'garnish', 'unit')),
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(kind, name)
);

-- Cocktails table
CREATE TABLE cocktails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  method TEXT,
  glass TEXT,
  ice TEXT,
  garnish TEXT,
  notes TEXT,
  price DECIMAL(10,2),
  last_special_on DATE,
  is_ology_recipe BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipe ingredients table (cocktail ingredients with amounts)
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cocktail_id UUID NOT NULL REFERENCES cocktails(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  amount DECIMAL(10,3) NOT NULL,
  unit TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cocktail tags table (many-to-many relationship)
CREATE TABLE cocktail_tags (
  cocktail_id UUID NOT NULL REFERENCES cocktails(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (cocktail_id, tag_id)
);

-- ==============================================
-- 3. CREATE INDEXES
-- ==============================================
CREATE INDEX idx_cocktails_name ON cocktails(name);
CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_catalog_items_kind ON catalog_items(kind);
CREATE INDEX idx_recipe_ingredients_cocktail_id ON recipe_ingredients(cocktail_id);
CREATE INDEX idx_cocktail_tags_cocktail_id ON cocktail_tags(cocktail_id);

-- ==============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ==============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cocktails ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cocktail_tags ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 5. CREATE RLS POLICIES
-- ==============================================

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Ingredients policies
CREATE POLICY "Anyone can read ingredients" ON ingredients
FOR SELECT USING (true);

CREATE POLICY "Editors and admins can insert ingredients" ON ingredients
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
  )
);

CREATE POLICY "Admins can update ingredients" ON ingredients
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete ingredients" ON ingredients
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Tags policies
CREATE POLICY "Anyone can read tags" ON tags
FOR SELECT USING (true);

CREATE POLICY "Admins can manage tags" ON tags
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Catalog items policies
CREATE POLICY "Anyone can read catalog items" ON catalog_items
FOR SELECT USING (true);

CREATE POLICY "Admins can manage catalog items" ON catalog_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Cocktails policies
CREATE POLICY "Anyone can read cocktails" ON cocktails
FOR SELECT USING (true);

CREATE POLICY "Editors and admins can insert cocktails" ON cocktails
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
  )
);

CREATE POLICY "Editors and admins can update cocktails" ON cocktails
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
  )
);

CREATE POLICY "Admins can delete cocktails" ON cocktails
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Recipe ingredients policies
CREATE POLICY "Anyone can read recipe ingredients" ON recipe_ingredients
FOR SELECT USING (true);

CREATE POLICY "Editors and admins can manage recipe ingredients" ON recipe_ingredients
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
  )
);

-- Cocktail tags policies
CREATE POLICY "Anyone can read cocktail tags" ON cocktail_tags
FOR SELECT USING (true);

CREATE POLICY "Editors and admins can manage cocktail tags" ON cocktail_tags
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
  )
);

-- ==============================================
-- 6. INSERT DEFAULT DATA
-- ==============================================

-- Insert default catalog items
INSERT INTO catalog_items (kind, name, position, active) VALUES
-- Methods
('method', 'Shake', 1, true),
('method', 'Stir', 2, true),
('method', 'Build', 3, true),
('method', 'Muddle', 4, true),
('method', 'Blend', 5, true),

-- Glasses
('glass', 'Coupe', 1, true),
('glass', 'Highball', 2, true),
('glass', 'Rocks', 3, true),
('glass', 'Martini', 4, true),
('glass', 'Collins', 5, true),

-- Ice
('ice', 'Cubed', 1, true),
('ice', 'Crushed', 2, true),
('ice', 'Large Cube', 3, true),
('ice', 'No Ice', 4, true),

-- Garnishes
('garnish', 'Lime Wheel', 1, true),
('garnish', 'Lemon Twist', 2, true),
('garnish', 'Orange Peel', 3, true),
('garnish', 'Cherry', 4, true),
('garnish', 'Mint Sprig', 5, true),

-- Units
('unit', 'oz', 1, true),
('unit', 'ml', 2, true),
('unit', 'dash', 3, true),
('unit', 'drop', 4, true),
('unit', 'barspoon', 5, true),
('unit', 'tsp', 6, true),
('unit', 'tbsp', 7, true);

-- Insert default tags
INSERT INTO tags (name, color) VALUES
('Classic', '#3B82F6'),
('Modern', '#10B981'),
('Tiki', '#F59E0B'),
('Bitter', '#EF4444'),
('Sweet', '#8B5CF6'),
('Sour', '#06B6D4'),
('Spicy', '#F97316'),
('Smoky', '#6B7280');

-- ==============================================
-- 7. CREATE YOUR ADMIN PROFILE
-- ==============================================
-- Replace 'your-email@example.com' with your actual email
-- You'll need to get your user ID from auth.users table first
-- Run this query to find your user ID:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then uncomment and run this with your actual user ID:
-- INSERT INTO profiles (user_id, email, role)
-- VALUES ('your-user-id-here', 'your-email@example.com', 'admin');

-- ==============================================
-- 8. VERIFICATION QUERIES
-- ==============================================
-- Run these to verify everything is set up correctly:

-- Check tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policies exist
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- Check default data
SELECT kind, name FROM catalog_items ORDER BY kind, position;
SELECT name, color FROM tags;
