-- Introduce development_status for cocktails and migrate existing data
ALTER TABLE cocktails
  ADD COLUMN development_status TEXT NOT NULL DEFAULT 'ready';

ALTER TABLE cocktails
  ADD CONSTRAINT check_cocktails_development_status
  CHECK (development_status IN ('ready', 'in_progress', 'untested'));

-- Migrate legacy work-in-progress flag into the new status field
UPDATE cocktails
SET development_status = 'in_progress'
WHERE COALESCE(is_work_in_progress, false) = true;

-- Ensure remaining cocktails default to ready
UPDATE cocktails
SET development_status = 'ready'
WHERE development_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_cocktails_development_status
  ON cocktails(development_status);

ALTER TABLE cocktails
  DROP COLUMN IF EXISTS is_work_in_progress;



