CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  description text DEFAULT '' CHECK (char_length(description) <= 5000),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('inbox', 'todo', 'doing', 'done', 'cancelled')),
  priority text NOT NULL DEFAULT 'none' CHECK (priority IN ('none', 'low', 'medium', 'high')),
  list_name text NOT NULL DEFAULT '收件箱' CHECK (char_length(list_name) BETWEEN 1 AND 100),
  start_date timestamptz,
  due_date timestamptz,
  reminder_at timestamptz,
  recurrence_rule text NOT NULL DEFAULT 'none' CHECK (recurrence_rule IN ('none', 'daily', 'workday', 'weekly', 'monthly', 'yearly')),
  completed_at timestamptz,
  source_memo_id uuid REFERENCES memos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS tasks_active_due_idx
  ON tasks (due_date ASC, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS tasks_active_list_idx
  ON tasks (list_name, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS tasks_active_status_idx
  ON tasks (status, created_at DESC)
  WHERE deleted_at IS NULL;
