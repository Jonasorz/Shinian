ALTER TABLE memo_attachments
ADD COLUMN IF NOT EXISTS thumbnail_storage_key text;

CREATE UNIQUE INDEX IF NOT EXISTS memo_attachments_thumbnail_storage_key_idx
  ON memo_attachments (thumbnail_storage_key)
  WHERE thumbnail_storage_key IS NOT NULL;
