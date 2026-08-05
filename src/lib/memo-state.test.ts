import { describe, expect, it } from "vitest";
import type { Memo, MemoAttachment } from "@/lib/types";
import { memoWorkspaceVersion } from "@/lib/memo-state";

function memo(id: string, createdAt: string, attachments: MemoAttachment[] = []): Memo {
  return {
    id,
    content: id,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    attachments,
  };
}

describe("memoWorkspaceVersion", () => {
  it("changes when the server adds an attachment to an existing memo", () => {
    const attachment: MemoAttachment = {
      id: "attachment-1",
      memoId: "memo-1",
      filename: "photo.jpg",
      contentType: "image/jpeg",
      byteSize: 1024,
      createdAt: "2026-08-05T10:01:00.000Z",
      url: "/api/attachments/attachment-1",
      thumbnailUrl: null,
    };
    const before = [memo("memo-1", "2026-08-05T10:00:00.000Z")];
    const after = [
      memo("memo-1", "2026-08-05T10:00:00.000Z", [attachment]),
    ];

    expect(memoWorkspaceVersion(after)).not.toBe(
      memoWorkspaceVersion(before),
    );
  });
});
