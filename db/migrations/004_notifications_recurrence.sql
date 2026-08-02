ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS previous_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_previous_task_unique_idx
  ON tasks (previous_task_id)
  WHERE previous_task_id IS NOT NULL;
