CREATE TABLE IF NOT EXISTS task_lists (
  name text PRIMARY KEY CHECK (char_length(name) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO task_lists (name)
VALUES ('收件箱')
ON CONFLICT (name) DO NOTHING;

INSERT INTO task_lists (name)
SELECT DISTINCT list_name
FROM tasks
WHERE deleted_at IS NULL
ON CONFLICT (name) DO NOTHING;
