import { z } from "zod";

export const DEFAULT_MEMO_PAGE_SIZE = 30;
export const MAX_MEMO_PAGE_SIZE = 50;

const cursorSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().uuid(),
});

export type MemoCursor = z.infer<typeof cursorSchema>;

export function normalizeMemoPageSize(value: string | null): number {
  if (!value) return DEFAULT_MEMO_PAGE_SIZE;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_MEMO_PAGE_SIZE;
  return Math.min(parsed, MAX_MEMO_PAGE_SIZE);
}

export function encodeMemoCursor(cursor: MemoCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeMemoCursor(value: string | null): MemoCursor | null {
  if (!value) return null;
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const parsed = cursorSchema.safeParse(decoded);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
