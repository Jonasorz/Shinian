CREATE TABLE IF NOT EXISTS memo_attachments (
  id uuid PRIMARY KEY,
  memo_id uuid NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  filename text NOT NULL CHECK (char_length(filename) BETWEEN 1 AND 255),
  content_type text NOT NULL CHECK (char_length(content_type) BETWEEN 1 AND 100),
  byte_size integer NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
  storage_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memo_attachments_memo_idx
  ON memo_attachments (memo_id, created_at ASC);
