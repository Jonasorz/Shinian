import { NextRequest, NextResponse } from "next/server";
import { apiError, authorizeApiRequest } from "@/lib/api";
import { listMemos, listTasks } from "@/lib/db";
import { createObsidianExportZip, generateFullJsonExport } from "@/lib/export";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!(await authorizeApiRequest())) {
    return apiError("请先登录", 401);
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "markdown";

  const [memos, tasks] = await Promise.all([
    listMemos(),
    listTasks({ view: "all" }),
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
  const zipBuffer = createObsidianExportZip(memos, tasks);
  return new NextResponse(Buffer.from(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="shinian_obsidian_${dateStr}.zip"`,
    },
  });
}
