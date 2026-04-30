-- Migration: add storage_key, is_summary, uploaded_by to attachments

BEGIN;

ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS storage_key TEXT,
  ADD COLUMN IF NOT EXISTS is_summary BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments (task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_storage_key ON attachments (storage_key);

COMMIT;
