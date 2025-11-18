-- Add is_work_in_progress column to cocktails table
ALTER TABLE cocktails ADD COLUMN is_work_in_progress BOOLEAN NOT NULL DEFAULT false;

-- Create index for better query performance when filtering by work in progress status
CREATE INDEX idx_cocktails_work_in_progress ON cocktails(is_work_in_progress);
