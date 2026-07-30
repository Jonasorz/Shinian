import "server-only";

import postgres, { type Sql } from "postgres";
import { extractTags, type TagWithCount } from "./tags";
export type { TagWithCount };
import type {
  Memo,
  RecurrenceRule,
  Task,
  TaskFilterView,
  TaskPriority,
  TaskStatus,
} from "./types";

type MemoRow = {
  id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

type TaskRow = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  list_name: string;
  start_date: Date | null;
  due_date: Date | null;
  reminder_at: Date | null;
  recurrence_rule: RecurrenceRule;
  completed_at: Date | null;
  source_memo_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

const globalDatabase = globalThis as typeof globalThis & {
  shinianSql?: Sql;
};

function database(): Sql {
  if (globalDatabase.shinianSql) {
    return globalDatabase.shinianSql;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  const sql = postgres(databaseUrl, {
    max: process.env.NODE_ENV === "production" ? 10 : 3,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  globalDatabase.shinianSql = sql;
  return sql;
}

function toMemo(row: MemoRow): Memo {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: row.deleted_at?.toISOString() ?? null,
  };
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    status: row.status,
    priority: row.priority,
    listName: row.list_name,
    startDate: row.start_date?.toISOString() ?? null,
    dueDate: row.due_date?.toISOString() ?? null,
    reminderAt: row.reminder_at?.toISOString() ?? null,
    recurrenceRule: row.recurrence_rule,
    completedAt: row.completed_at?.toISOString() ?? null,
    sourceMemoId: row.source_memo_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: row.deleted_at?.toISOString() ?? null,
  };
}

export async function listMemos(): Promise<Memo[]> {
  const rows = await database()<MemoRow[]>`
    SELECT id, content, created_at, updated_at, deleted_at
    FROM memos
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 500
  `;

  return rows.map(toMemo);
}

export async function createMemo(content: string): Promise<Memo> {
  const id = crypto.randomUUID();
  const [row] = await database()<MemoRow[]>`
    INSERT INTO memos (id, content)
    VALUES (${id}, ${content})
    RETURNING id, content, created_at, updated_at, deleted_at
  `;

  return toMemo(row);
}

export async function updateMemo(
  id: string,
  input: { content?: string; restore?: boolean },
): Promise<Memo | null> {
  const sql = database();
  let rows: MemoRow[];

  if (input.restore) {
    rows = await sql<MemoRow[]>`
      UPDATE memos
      SET deleted_at = NULL, updated_at = now()
      WHERE id = ${id}
      RETURNING id, content, created_at, updated_at, deleted_at
    `;
  } else {
    rows = await sql<MemoRow[]>`
      UPDATE memos
      SET content = ${input.content ?? ""}, updated_at = now()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id, content, created_at, updated_at, deleted_at
    `;
  }

  return rows[0] ? toMemo(rows[0]) : null;
}

export async function softDeleteMemo(id: string): Promise<Memo | null> {
  const rows = await database()<MemoRow[]>`
    UPDATE memos
    SET deleted_at = now(), updated_at = now()
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING id, content, created_at, updated_at, deleted_at
  `;

  return rows[0] ? toMemo(rows[0]) : null;
}

/* -------------------------------------------------------------------------- */
/*                                Task Operations                             */
/* -------------------------------------------------------------------------- */

export async function listTasks(params?: {
  view?: TaskFilterView;
  listName?: string;
}): Promise<Task[]> {
  const sql = database();
  const { view, listName } = params ?? {};

  let rows: TaskRow[];

  if (listName) {
    rows = await sql<TaskRow[]>`
      SELECT * FROM tasks
      WHERE deleted_at IS NULL AND list_name = ${listName}
      ORDER BY completed_at DESC NULLS FIRST, due_date ASC NULLS LAST, created_at DESC
      LIMIT 500
    `;
  } else if (view === "inbox") {
    rows = await sql<TaskRow[]>`
      SELECT * FROM tasks
      WHERE deleted_at IS NULL AND list_name = '收件箱' AND status NOT IN ('done', 'cancelled')
      ORDER BY due_date ASC NULLS LAST, created_at DESC
      LIMIT 500
    `;
  } else if (view === "today") {
    rows = await sql<TaskRow[]>`
      SELECT * FROM tasks
      WHERE deleted_at IS NULL 
        AND status NOT IN ('done', 'cancelled')
        AND (
          due_date <= (CURRENT_DATE + interval '1 day')
          OR start_date <= (CURRENT_DATE + interval '1 day')
        )
      ORDER BY due_date ASC NULLS LAST, created_at DESC
      LIMIT 500
    `;
  } else if (view === "next7") {
    rows = await sql<TaskRow[]>`
      SELECT * FROM tasks
      WHERE deleted_at IS NULL 
        AND status NOT IN ('done', 'cancelled')
        AND due_date IS NOT NULL
        AND due_date <= (CURRENT_DATE + interval '7 days')
      ORDER BY due_date ASC NULLS LAST, created_at DESC
      LIMIT 500
    `;
  } else if (view === "completed") {
    rows = await sql<TaskRow[]>`
      SELECT * FROM tasks
      WHERE deleted_at IS NULL AND status = 'done'
      ORDER BY completed_at DESC NULLS LAST, created_at DESC
      LIMIT 500
    `;
  } else {
    rows = await sql<TaskRow[]>`
      SELECT * FROM tasks
      WHERE deleted_at IS NULL
      ORDER BY completed_at DESC NULLS FIRST, due_date ASC NULLS LAST, created_at DESC
      LIMIT 500
    `;
  }

  return rows.map(toTask);
}

export async function listTaskLists(): Promise<string[]> {
  const rows = await database()<Array<{ list_name: string }>>`
    SELECT DISTINCT list_name
    FROM tasks
    WHERE deleted_at IS NULL
    ORDER BY list_name ASC
  `;
  const set = new Set(["收件箱", ...rows.map((r) => r.list_name)]);
  return Array.from(set);
}

export async function createTask(input: {
  title: string;
  description?: string;
  priority?: TaskPriority;
  listName?: string;
  startDate?: string | null;
  dueDate?: string | null;
  reminderAt?: string | null;
  recurrenceRule?: RecurrenceRule;
  sourceMemoId?: string | null;
}): Promise<Task> {
  const id = crypto.randomUUID();
  const [row] = await database()<TaskRow[]>`
    INSERT INTO tasks (
      id, title, description, priority, list_name,
      start_date, due_date, reminder_at, recurrence_rule, source_memo_id
    ) VALUES (
      ${id}, ${input.title}, ${input.description ?? ""}, ${input.priority ?? "none"},
      ${input.listName ?? "收件箱"}, ${input.startDate ? new Date(input.startDate) : null},
      ${input.dueDate ? new Date(input.dueDate) : null},
      ${input.reminderAt ? new Date(input.reminderAt) : null},
      ${input.recurrenceRule ?? "none"}, ${input.sourceMemoId ?? null}
    )
    RETURNING *
  `;

  return toTask(row);
}

export async function updateTask(
  id: string,
  input: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    listName?: string;
    startDate?: string | null;
    dueDate?: string | null;
    reminderAt?: string | null;
    recurrenceRule?: RecurrenceRule;
    restore?: boolean;
  },
): Promise<Task | null> {
  const sql = database();

  if (input.restore) {
    const [row] = await sql<TaskRow[]>`
      UPDATE tasks
      SET deleted_at = NULL, updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;
    return row ? toTask(row) : null;
  }

  // Fetch current row first to merge or update properly
  const [existing] = await sql<TaskRow[]>`
    SELECT * FROM tasks WHERE id = ${id} AND deleted_at IS NULL
  `;
  if (!existing) return null;

  const nextTitle = input.title ?? existing.title;
  const nextDescription = input.description ?? existing.description;
  const nextStatus = input.status ?? existing.status;
  const nextPriority = input.priority ?? existing.priority;
  const nextListName = input.listName ?? existing.list_name;
  const nextStartDate =
    input.startDate !== undefined
      ? input.startDate
        ? new Date(input.startDate)
        : null
      : existing.start_date;
  const nextDueDate =
    input.dueDate !== undefined
      ? input.dueDate
        ? new Date(input.dueDate)
        : null
      : existing.due_date;
  const nextReminderAt =
    input.reminderAt !== undefined
      ? input.reminderAt
        ? new Date(input.reminderAt)
        : null
      : existing.reminder_at;
  const nextRecurrenceRule = input.recurrenceRule ?? existing.recurrence_rule;

  let nextCompletedAt = existing.completed_at;
  if (input.status !== undefined) {
    if (input.status === "done") {
      nextCompletedAt = new Date();
    } else {
      nextCompletedAt = null;
    }
  }

  const [row] = await sql<TaskRow[]>`
    UPDATE tasks
    SET title = ${nextTitle},
        description = ${nextDescription},
        status = ${nextStatus},
        priority = ${nextPriority},
        list_name = ${nextListName},
        start_date = ${nextStartDate},
        due_date = ${nextDueDate},
        reminder_at = ${nextReminderAt},
        recurrence_rule = ${nextRecurrenceRule},
        completed_at = ${nextCompletedAt},
        updated_at = now()
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING *
  `;

  return row ? toTask(row) : null;
}

export async function softDeleteTask(id: string): Promise<Task | null> {
  const [row] = await database()<TaskRow[]>`
    UPDATE tasks
    SET deleted_at = now(), updated_at = now()
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING *
  `;

  return row ? toTask(row) : null;
}

/* -------------------------------------------------------------------------- */
/*                                Search & Tags                               */
/* -------------------------------------------------------------------------- */

export type SearchResult = {
  memos: Memo[];
  tasks: Task[];
};

export async function searchMemosAndTasks(params: {
  query?: string;
  tag?: string;
  type?: "all" | "memo" | "task";
}): Promise<{ memos: Memo[]; tasks: Task[] }> {
  const sql = database();
  const q = params.query?.trim() ?? "";
  const tag = params.tag?.trim() ?? "";
  const type = params.type ?? "all";

  const isUntaggedQuery =
    tag === "#无标签" || tag === "无标签" || q === "#无标签" || q === "无标签";

  if (isUntaggedQuery) {
    const allMemos = await listMemos();
    const memos = allMemos.filter((m) => extractTags(m.content).length === 0);
    return { memos, tasks: [] };
  }

  let memos: Memo[] = [];
  let tasks: Task[] = [];

  const memoPattern = q ? `%${q}%` : null;
  const tagPattern = tag
    ? tag.startsWith("#")
      ? `%${tag}%`
      : `%#${tag}%`
    : null;

  if (type === "all" || type === "memo") {
    if (tagPattern && memoPattern) {
      const rows = await sql<MemoRow[]>`
        SELECT * FROM memos
        WHERE deleted_at IS NULL
          AND content ILIKE ${memoPattern}
          AND content ILIKE ${tagPattern}
        ORDER BY created_at DESC
        LIMIT 200
      `;
      memos = rows.map(toMemo);
    } else if (tagPattern) {
      const rows = await sql<MemoRow[]>`
        SELECT * FROM memos
        WHERE deleted_at IS NULL AND content ILIKE ${tagPattern}
        ORDER BY created_at DESC
        LIMIT 200
      `;
      memos = rows.map(toMemo);
    } else if (memoPattern) {
      const rows = await sql<MemoRow[]>`
        SELECT * FROM memos
        WHERE deleted_at IS NULL AND content ILIKE ${memoPattern}
        ORDER BY created_at DESC
        LIMIT 200
      `;
      memos = rows.map(toMemo);
    } else {
      memos = await listMemos();
    }
  }

  // Tag filters (from tag library) return ONLY Memos, never Tasks
  if (!tagPattern && (type === "all" || type === "task")) {
    if (memoPattern) {
      const rows = await sql<TaskRow[]>`
        SELECT * FROM tasks
        WHERE deleted_at IS NULL
          AND (title ILIKE ${memoPattern} OR description ILIKE ${memoPattern})
        ORDER BY created_at DESC
        LIMIT 200
      `;
      tasks = rows.map(toTask);
    } else {
      tasks = await listTasks({ view: "all" });
    }
  }

  return { memos, tasks };
}

export async function getAllTagsWithCounts(): Promise<TagWithCount[]> {
  const sql = database();
  const memoRows = await sql<Array<{ content: string }>>`
    SELECT content FROM memos WHERE deleted_at IS NULL
  `;

  const countsMap = new Map<string, number>();
  let untaggedCount = 0;

  for (const m of memoRows) {
    const memoTags = extractTags(m.content);
    if (memoTags.length === 0) {
      untaggedCount++;
    } else {
      for (const tag of new Set(memoTags)) {
        countsMap.set(tag, (countsMap.get(tag) ?? 0) + 1);
      }
    }
  }

  const result: TagWithCount[] = Array.from(countsMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  if (untaggedCount > 0) {
    result.unshift({ tag: "#无标签", count: untaggedCount });
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/*                                Daily Review                                */

export async function getDailyReviewMemos(params?: {
  limit?: number;
  excludeDays?: number;
}): Promise<Memo[]> {
  const sql = database();
  const limit = params?.limit ?? 8;
  const excludeDays = params?.excludeDays ?? 30;

  // Query memos created before excludeDays ago (or fallback if fewer)
  let rows = await sql<MemoRow[]>`
    SELECT * FROM memos
    WHERE deleted_at IS NULL
      AND created_at < (CURRENT_DATE - (${excludeDays} * interval '1 day'))
    ORDER BY RANDOM()
    LIMIT ${limit}
  `;

  if (rows.length < limit) {
    rows = await sql<MemoRow[]>`
      SELECT * FROM memos
      WHERE deleted_at IS NULL
      ORDER BY RANDOM()
      LIMIT ${limit}
    `;
  }

  return rows.map(toMemo);
}

export async function getYearAgoMemos(): Promise<Memo[]> {
  const sql = database();
  const rows = await sql<MemoRow[]>`
    SELECT * FROM memos
    WHERE deleted_at IS NULL
      AND created_at >= (CURRENT_DATE - interval '1 year' - interval '3 days')
      AND created_at <= (CURRENT_DATE - interval '1 year' + interval '3 days')
    ORDER BY created_at DESC
    LIMIT 10
  `;

  return rows.map(toMemo);
}

/* -------------------------------------------------------------------------- */
/*                                Import Batches                              */
/* -------------------------------------------------------------------------- */

export type ImportBatch = {
  id: string;
  source: string;
  memoCount: number;
  taskCount: number;
  createdAt: string;
};

type ImportBatchRow = {
  id: string;
  source: string;
  memo_count: number;
  task_count: number;
  created_at: Date;
};

export async function listImportBatches(): Promise<ImportBatch[]> {
  const sql = database();
  const rows = await sql<ImportBatchRow[]>`
    SELECT id, source, memo_count, task_count, created_at
    FROM import_batches
    ORDER BY created_at DESC
    LIMIT 30
  `;
  return rows.map((r) => ({
    id: r.id,
    source: r.source,
    memoCount: r.memo_count,
    taskCount: r.task_count,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function createImportBatch(params: {
  source: string;
  memos: Array<{ content: string; createdAt?: string }>;
  tasks: Array<{
    title: string;
    description?: string;
    listName?: string;
    dueDate?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
  }>;
}): Promise<ImportBatch> {
  const sql = database();
  const batchId = crypto.randomUUID();

  const [batchRow] = await sql<ImportBatchRow[]>`
    INSERT INTO import_batches (id, source, memo_count, task_count)
    VALUES (${batchId}, ${params.source}, ${params.memos.length}, ${params.tasks.length})
    RETURNING id, source, memo_count, task_count, created_at
  `;

  // Bulk insert Memos
  for (const m of params.memos) {
    const memoId = crypto.randomUUID();
    const createdAt = m.createdAt ? new Date(m.createdAt) : new Date();
    await sql`
      INSERT INTO memos (id, content, created_at, import_batch_id)
      VALUES (${memoId}, ${m.content}, ${createdAt}, ${batchId})
    `;
  }

  // Bulk insert Tasks
  for (const t of params.tasks) {
    const taskId = crypto.randomUUID();
    const dueDate = t.dueDate ? new Date(t.dueDate) : null;
    const status = t.status ?? "todo";
    const completedAt = status === "done" ? new Date() : null;

    await sql`
      INSERT INTO tasks (
        id, title, description, priority, list_name, status,
        due_date, completed_at, import_batch_id
      ) VALUES (
        ${taskId}, ${t.title}, ${t.description ?? ""}, ${t.priority ?? "none"},
        ${t.listName ?? "收件箱"}, ${status}, ${dueDate}, ${completedAt}, ${batchId}
      )
    `;
  }

  return {
    id: batchRow.id,
    source: batchRow.source,
    memoCount: batchRow.memo_count,
    taskCount: batchRow.task_count,
    createdAt: batchRow.created_at.toISOString(),
  };
}

export async function undoImportBatch(batchId: string): Promise<boolean> {
  const sql = database();
  await sql.begin(async (transaction) => {
    await transaction`
      UPDATE memos SET deleted_at = now() WHERE import_batch_id = ${batchId}
    `;
    await transaction`
      UPDATE tasks SET deleted_at = now() WHERE import_batch_id = ${batchId}
    `;
    await transaction`
      DELETE FROM import_batches WHERE id = ${batchId}
    `;
  });
  return true;
}




