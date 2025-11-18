-- Add development_status column to cocktails table
-- Run this in your Supabase SQL Editor

-- Add the column with a default value
ALTER TABLE cocktails
  ADD COLUMN IF NOT EXISTS development_status TEXT NOT NULL DEFAULT 'ready';

-- Add the check constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_cocktails_development_status'
  ) THEN
    ALTER TABLE cocktails
      ADD CONSTRAINT check_cocktails_development_status
      CHECK (development_status IN ('ready', 'in_progress', 'untested'));
  END IF;
END $$;

-- Ensure all existing cocktails have the default value
UPDATE cocktails
SET development_status = 'ready'
WHERE development_status IS NULL;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_cocktails_development_status
  ON cocktails(development_status);

