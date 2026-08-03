import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  authorizeApiRequest,
  authorizeMutationOrigin,
} from "@/lib/api";
import { createImportBatch } from "@/lib/db";
import {
  parseFlomoHtml,
  parseShinianJson,
  parseTickTickCsv,
} from "@/lib/importers";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const originError = authorizeMutationOrigin(request);
  if (originError) {
    return originError;
  }
  if (!(await authorizeApiRequest())) {
    return apiError("请先登录", 401);
  }

  const body = (await request.json().catch(() => null)) as {
    source?: "flomo" | "ticktick" | "shinian_json";
    fileContent?: string;
    action?: "preview" | "commit";
  } | null;

  if (!body || !body.source || !body.fileContent) {
    return apiError("无效的导入文件或缺少必填参数", 400);
  }

  const { source, fileContent, action = "preview" } = body;

  let parseResult;
  try {
    if (source === "flomo") {
      parseResult = parseFlomoHtml(fileContent);
    } else if (source === "ticktick") {
      parseResult = parseTickTickCsv(fileContent);
    } else {
      parseResult = parseShinianJson(fileContent);
    }
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "文件解析失败，请检查格式",
      400,
    );
  }

  if (action === "preview") {
    return NextResponse.json({
      action: "preview",
      source,
      previewStats: parseResult.previewStats,
      sampleMemos: parseResult.memos.slice(0, 3),
      sampleTasks: parseResult.tasks.slice(0, 3),
    });
  }

  // Action: Commit
  if (parseResult.memos.length === 0 && parseResult.tasks.length === 0) {
    return apiError("没有找到可导入的卡片笔记或任务记录", 400);
  }

  const { batch, memoIds } = await createImportBatch({
    source,
    memos: parseResult.memos,
    tasks: parseResult.tasks,
  });

  return NextResponse.json({
    action: "commit",
    batch,
    importedMemos: parseResult.memos.map((memo, index) => ({
      id: memoIds[index]!,
      attachmentPaths: memo.attachmentPaths ?? [],
    })),
    message: `成功导入 ${batch.memoCount} 条笔记，${batch.taskCount} 条任务！`,
  });
}
