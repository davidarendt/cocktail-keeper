-- Add photo_url column to cocktails table
-- Run this in Supabase SQL Editor

ALTER TABLE cocktails 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN cocktails.photo_url IS 'URL to the photo/image of the cocktail stored in Supabase Storage';

