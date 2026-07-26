CREATE TABLE IF NOT EXISTS memos (
  id uuid PRIMARY KEY,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS memos_active_created_idx
  ON memos (created_at DESC)
  WHERE deleted_at IS NULL;

