import { NextRequest, NextResponse } from "next/server";
import { apiError, authorizeApiRequest } from "@/lib/api";
import {
  listAllMemos,
  listAllTasks,
  listStoredMemoAttachments,
} from "@/lib/db";
import { createObsidianExportZip, generateFullJsonExport } from "@/lib/export";
import { readAttachmentFile } from "@/lib/attachments";

export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!(await authorizeApiRequest())) {
    return apiError("请先登录", 401);
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "markdown";

  const [memos, tasks, storedAttachments] = await Promise.all([
    listAllMemos(),
    listAllTasks(),
    listStoredMemoAttachments(),
  ]);

  const dateStr = new Date().toISOString().split("T")[0]!.replace(/-/g, "");

  if (format === "json") {
    const jsonContent = generateFullJsonExport(memos, tasks);
    return new NextResponse(jsonContent, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="shinian_backup_${dateStr}.json"`,
      },
    });
  }

  // Default: ZIP with Obsidian Vault Markdown
  const attachmentFiles = await Promise.all(
    storedAttachments.map(async (attachment) => ({
      path: `${attachment.id}_${attachment.filename.replace(/[/\\?%*:|"<>]/g, "_")}`,
      bytes: new Uint8Array(await readAttachmentFile(attachment.storageKey)),
    })),
  );
  const zipBuffer = createObsidianExportZip(memos, tasks, attachmentFiles);
  return new NextResponse(Buffer.from(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="shinian_obsidian_${dateStr}.zip"`,
    },
  });
}
