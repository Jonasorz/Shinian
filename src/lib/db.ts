import "server-only";

import postgres, { type Sql } from "postgres";
import type { Memo } from "./types";

type MemoRow = {
  id: string;
  content: string;
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

  if (process.env.NODE_ENV !== "production") {
    globalDatabase.shinianSql = sql;
  }

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

