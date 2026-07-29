import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  authorizeApiRequest,
  authorizeMutationOrigin,
} from "@/lib/api";
import { undoImportBatch } from "@/lib/db";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const originError = authorizeMutationOrigin(request);
  if (originError) {
    return originError;
  }
  if (!(await authorizeApiRequest())) {
    return apiError("请先登录", 401);
  }

  const body = (await request.json().catch(() => null)) as {
    batchId?: string;
  } | null;

  if (!body || !body.batchId) {
    return apiError("缺少批次 ID", 400);
  }

  await undoImportBatch(body.batchId);

  return NextResponse.json({
    success: true,
    message: "该批次导入的所有数据已成功撤销！",
  });
}
