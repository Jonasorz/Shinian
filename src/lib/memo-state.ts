import type { Memo } from "@/lib/types";

export function sortMemos(memos: Memo[]): Memo[] {
  return [...memos].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() -
      new Date(left.createdAt).getTime(),
  );
}

export function memoWorkspaceVersion(memos: Memo[]): string {
  return memos
    .map((memo) =>
      [
        memo.id,
        memo.updatedAt,
        ...memo.attachments.flatMap((attachment) => [
          attachment.id,
          attachment.thumbnailUrl ?? "",
        ]),
      ].join(":"),
    )
    .join("|");
}
