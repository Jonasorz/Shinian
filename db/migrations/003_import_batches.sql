CREATE TABLE IF NOT EXISTS import_batches (
  id uuid PRIMARY KEY,
  source text NOT NULL CHECK (char_length(source) BETWEEN 1 AND 50),
  memo_count integer NOT NULL DEFAULT 0,
  task_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE memos
  ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES import_batches(id) ON DELETE SET NULL;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES import_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS memos_import_batch_idx ON memos (import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tasks_import_batch_idx ON tasks (import_batch_id) WHERE import_batch_id IS NOT NULL;
